import cron from "cron";
import { LangliveUserSettingConsumer } from "../consumers";
import { RouletteBets, RouletteLeaderboardModel } from "../models";

export default class RouletteLeaderboardAccumulator {
    logService: any;

    definition: any;

    appConfigs: any;

    langliveUserSettingConsumer: LangliveUserSettingConsumer;

    private isRunning: boolean = false;

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
                // Prevent multiple instances from running simultaneously
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
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const dateKey = date.toISOString().slice(0, 10);

        let cache = await RouletteLeaderboardModel.findOne({ date: dateKey }).lean().exec();
        let lastProcessedTime = cache?.lastProcessedTime || start;

        const newBets = await RouletteBets.find({
            paid: true,
            time: { $gt: lastProcessedTime, $lte: end },
        })
            .lean()
            .exec();

        if (!newBets.length) {
            await RouletteLeaderboardModel.findOneAndUpdate({ date: dateKey }, { updatedAt: new Date() }, { upsert: true }).exec();
            return;
        }

        const playerMap = new Map();
        for (const bet of newBets) {
            const uid = bet.uid;
            const betwin = typeof bet.betwin === "number" && !isNaN(bet.betwin) ? bet.betwin : 0;

            if (!playerMap.has(uid)) {
                playerMap.set(uid, { totalWin: 0 });
            }
            const entry = playerMap.get(uid);
            entry.totalWin += betwin;
        }

        let leaderboard = cache?.leaderboard || [];
        const leaderboardMap = new Map();
        for (const entry of leaderboard) {
            const totalWin = typeof entry.totalWin === "number" && !isNaN(entry.totalWin) ? entry.totalWin : 0;
            leaderboardMap.set(entry.uid, { ...entry, totalWin });
        }

        for (const [uid, { totalWin }] of playerMap.entries()) {
            if (leaderboardMap.has(uid)) {
                const entry = leaderboardMap.get(uid);
                entry.totalWin += totalWin;
            } else {
                leaderboardMap.set(uid, {
                    uid,
                    totalWin,
                    rank: 0,
                });
            }
        }

        leaderboard = Array.from(leaderboardMap.values());
        leaderboard.sort((a, b) => {
            const aWin = typeof a.totalWin === "number" && !isNaN(a.totalWin) ? a.totalWin : 0;
            const bWin = typeof b.totalWin === "number" && !isNaN(b.totalWin) ? b.totalWin : 0;
            return bWin - aWin;
        });
        leaderboard.forEach((entry, idx) => (entry.rank = idx + 1));

        const newestTime = newBets.reduce((max: Date, bet: any) => (bet.time > max ? bet.time : max), lastProcessedTime);

        await RouletteLeaderboardModel.findOneAndUpdate(
            { date: dateKey },
            {
                leaderboard: leaderboard,
                updatedAt: new Date(),
                lastProcessedTime: newestTime,
            },
            { upsert: true, new: true }
        ).exec();
    }
}
