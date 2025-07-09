import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";
import cron from "cron";
import { RouletteBets, RouletteLeaderboardModel } from "../models";
import { LangliveUserSettingConsumer } from "../consumers";

export default class RouletteLeaderboardAccumulator {
    logService: any;

    definition: any;

    appConfigs: any;

    langliveUserSettingConsumer: LangliveUserSettingConsumer;

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
            onTick: () => this.accumulateIncremental(new Date()).catch(this.logService.logError),
            onComplete: () => {
                this.logService.logError(
                    `${
                        this.definition.name
                    } leader board accumulate unexpectedly stopped at ${new Date().toISOString()} because some other tasks halt it.`
                );
                job.start();
            },
            start: true, // Start the schedule immediately
            runOnInit: true, // <-- This will run the job immediately after definition
        });
    }

    // Called by cron every 5 minutes
    async accumulateIncremental(date: Date) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const dateKey = start.toISOString().slice(0, 10);

        let cache = await RouletteLeaderboardModel.findOne({ date: dateKey });
        let lastProcessedTime = cache?.lastProcessedTime || start;

        const newBets = await RouletteBets.find({
            paid: true,
            time: { $gt: lastProcessedTime, $lte: end },
        });

        if (!newBets.length) {
            await RouletteLeaderboardModel.findOneAndUpdate({ date: dateKey }, { updatedAt: new Date() }, { upsert: true });
            return;
        }

        const playerMap = new Map();
        for (const bet of newBets) {
            const uid = bet.uid;
            if (!playerMap.has(uid)) {
                playerMap.set(uid, { totalWin: 0 });
            }
            const entry = playerMap.get(uid);
            entry.totalWin += bet.betwin;
        }

        let leaderboard = cache?.leaderboard || [];
        const leaderboardMap = new Map();
        for (const entry of leaderboard) {
            leaderboardMap.set(entry.uid, { ...entry });
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
        leaderboard.sort((a, b) => b.totalWin - a.totalWin);
        leaderboard.forEach((entry, idx) => (entry.rank = idx + 1));

        const newestTime = newBets.reduce((max: Date, bet: any) => (bet.time > max ? bet.time : max), lastProcessedTime);

        await RouletteLeaderboardModel.findOneAndUpdate(
            { date: dateKey },
            {
                leaderboard: leaderboard.slice(0, 30),
                updatedAt: new Date(),
                lastProcessedTime: newestTime,
            },
            { upsert: true }
        );
    }
}
