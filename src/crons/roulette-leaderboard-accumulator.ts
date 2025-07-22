import cron from "cron";
import { LangliveUserSettingConsumer } from "../consumers";
import { RouletteBets, RouletteLeaderboardModel } from "../models";

export default class RouletteLeaderboardAccumulator {
    logService: any;

    definition: any;

    appConfigs: any;

    langliveUserSettingConsumer: LangliveUserSettingConsumer;

    private isRunning = false;

    constructor({
        definition,
        appConfigs,
        logService,
        langliveUserSettingConsumer,
    }: {
        definition: any;
        appConfigs: any;
        logService: any;
        langliveUserSettingConsumer: LangliveUserSettingConsumer;
    }) {
        this.definition = definition;
        this.appConfigs = appConfigs;
        this.logService = logService;
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
    }

    start() {
        const job = new cron.CronJob({
            cronTime: this.appConfigs?.cronTimeGetLeaderboard || "*/5 * * * *",
            onTick: () => {
                if (this.isRunning) {
                    this.logService.logError(
                        `${this.definition.name} leaderboard accumulation is already running, skipping this execution.`
                    );
                    return;
                }

                this.isRunning = true;
                this.accumulateIncremental(new Date())
                    .catch(this.logService.logError)
                    .finally(() => {
                        this.isRunning = false;
                    });
            },
            onComplete: () => {
                this.logService.logError(
                    `${
                        this.definition.name
                    } leader board accumulate unexpectedly stopped at ${new Date().toISOString()} because some other tasks halt it.`
                );
                job.start();
            },
            start: true,
            runOnInit: true,
        });
    }

    async accumulateIncremental(date: Date) {
        const { start, end, dateKey } = this.getDateRange(date);
        const leaderboardMap = await this.getExistingLeaderboards(dateKey, start);
        const betsByCurrencyOperator = await this.getNewBets(start, end, leaderboardMap);

        await this.updateLeaderboardsWithNewBets(betsByCurrencyOperator, leaderboardMap, dateKey, start);
        await this.updateUnchangedLeaderboards(betsByCurrencyOperator, leaderboardMap, dateKey);
    }

    private getDateRange(date: Date) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const dateKey = date.toISOString().slice(0, 10);
        return { start, end, dateKey };
    }

    private async getExistingLeaderboards(dateKey: string, start: Date) {
        const existingLeaderboards = await RouletteLeaderboardModel.find({ date: dateKey }).lean().exec();
        const leaderboardMap = new Map();

        existingLeaderboards.forEach((leaderboard) => {
            const key = `${leaderboard.currency}:${leaderboard.operatorId}`;
            leaderboardMap.set(key, {
                lastProcessedTime: leaderboard.lastProcessedTime || start,
                leaderboard: leaderboard.leaderboard || [],
            });
        });

        return leaderboardMap;
    }

    private async getNewBets(start: Date, end: Date, leaderboardMap: Map<string, any>) {
        const allBets = await RouletteBets.find({
            paid: true,
            time: { $gte: start, $lte: end },
        })
            .lean()
            .exec();

        const betsByCurrencyOperator = new Map();

        for (const bet of allBets) {
            if (!bet.currency || !bet.operatorId) {
                continue;
            }

            const key = `${bet.currency}:${bet.operatorId}`;
            const lastProcessedTime = leaderboardMap.get(key)?.lastProcessedTime || start;

            if (bet.time > lastProcessedTime) {
                if (!betsByCurrencyOperator.has(key)) {
                    betsByCurrencyOperator.set(key, {
                        currency: bet.currency,
                        operatorId: bet.operatorId,
                        bets: [],
                    });
                }
                betsByCurrencyOperator.get(key).bets.push(bet);
            }
        }

        return betsByCurrencyOperator;
    }

    private calculatePlayerTotals(bets: any[]) {
        const playerMap = new Map();
        for (const bet of bets) {
            const uid = bet.uid;
            const betwin = typeof bet.betwin === "number" && !isNaN(bet.betwin) ? bet.betwin : 0;

            if (!playerMap.has(uid)) {
                playerMap.set(uid, { totalWin: 0 });
            }
            playerMap.get(uid).totalWin += betwin;
        }
        return playerMap;
    }

    private updateLeaderboardEntries(existingLeaderboard: any[], playerMap: Map<string, any>) {
        const leaderboardMapForUpdate = new Map();

        for (const entry of existingLeaderboard) {
            const totalWin = typeof entry.totalWin === "number" && !isNaN(entry.totalWin) ? entry.totalWin : 0;
            leaderboardMapForUpdate.set(entry.uid, { ...entry, totalWin });
        }

        for (const [uid, { totalWin }] of playerMap.entries()) {
            if (leaderboardMapForUpdate.has(uid)) {
                leaderboardMapForUpdate.get(uid).totalWin += totalWin;
            } else {
                leaderboardMapForUpdate.set(uid, { uid, totalWin, rank: 0 });
            }
        }

        return Array.from(leaderboardMapForUpdate.values());
    }

    private sortAndRankLeaderboard(leaderboard: any[]) {
        leaderboard.sort((a, b) => {
            const aWin = typeof a.totalWin === "number" && !isNaN(a.totalWin) ? a.totalWin : 0;
            const bWin = typeof b.totalWin === "number" && !isNaN(b.totalWin) ? b.totalWin : 0;
            return bWin - aWin;
        });
        leaderboard.forEach((entry, idx) => (entry.rank = idx + 1));
        return leaderboard;
    }

    private async updateLeaderboardsWithNewBets(
        betsByCurrencyOperator: Map<string, any>,
        leaderboardMap: Map<string, any>,
        dateKey: string,
        start: Date
    ) {
        for (const [key, data] of betsByCurrencyOperator.entries()) {
            const { currency, operatorId, bets } = data;
            const existingData = leaderboardMap.get(key);

            const playerMap = this.calculatePlayerTotals(bets);
            let leaderboard = this.updateLeaderboardEntries(existingData?.leaderboard || [], playerMap);
            leaderboard = this.sortAndRankLeaderboard(leaderboard);

            const newestTime = bets.reduce(
                (max: Date, bet: any) => (bet.time > max ? bet.time : max),
                existingData?.lastProcessedTime || start
            );

            await RouletteLeaderboardModel.findOneAndUpdate(
                { date: dateKey, currency, operatorId },
                {
                    leaderboard,
                    updatedAt: new Date(),
                    lastProcessedTime: newestTime,
                },
                { upsert: true, new: true }
            ).exec();
        }
    }

    private async updateUnchangedLeaderboards(betsByCurrencyOperator: Map<string, any>, leaderboardMap: Map<string, any>, dateKey: string) {
        for (const [key, data] of leaderboardMap.entries()) {
            if (!betsByCurrencyOperator.has(key)) {
                const [currency, operatorId] = key.split(":");
                await RouletteLeaderboardModel.findOneAndUpdate(
                    { date: dateKey, currency, operatorId },
                    {
                        leaderboard: data.leaderboard,
                        updatedAt: new Date(),
                    },
                    { upsert: true }
                ).exec();
            }
        }
    }
}
