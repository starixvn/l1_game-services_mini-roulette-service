import { logger } from "sc-common";
import { RouletteLeaderboardModel } from "../models";
import { RouletteGameData } from "../roulette-game-data";
import LangliveUserSettingConsumer from "./langlive-user-setting-consumer";

export default class RouletteLeaderboardConsumer {
    gameData: RouletteGameData;
    langliveUserSettingConsumer: LangliveUserSettingConsumer;
    logService: typeof logger;

    constructor({
        gameData,
        langliveUserSettingConsumer,
        logService,
    }: {
        gameData: RouletteGameData;
        langliveUserSettingConsumer: LangliveUserSettingConsumer;
        logService: typeof logger;
    }) {
        this.gameData = gameData;
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
        this.logService = logService;
    }

    async consume(player: any, payload: { top: number } = { top: 30 }) {
        const leaderboard = await this.getLeaderboardByDay(new Date(), player.UID, payload.top);
        return leaderboard;
    }

    async getLeaderboardByDay(date: Date, uid: string, top: number) {
        const key = date.toISOString().split("T")[0];
        const leaderboard = await RouletteLeaderboardModel.findOne({ date: key }, { _id: 0, __v: 0, "leaderboard._id": 0 }).lean().exec();
        if (!leaderboard) {
            return { leaderboard: [], currentPlayer: { rank: -1, currentPlayerSettings: null, totalWin: 0 }, time: date.toISOString() };
        }

        const slicedLeaderboard = leaderboard.leaderboard.slice(0, top);
        let currentPlayerSettings = null;

        const enhancedLeaderboard = await Promise.all(
            slicedLeaderboard.map(async (player) => {
                const { uid: _uid, ...rest } = player;
                try {
                    const userSettings = await this.langliveUserSettingConsumer.getLangliveUserSettings(player.uid);

                    const formattedUserSettings = this.formatUserSettings(userSettings);

                    if (player.uid === uid) {
                        currentPlayerSettings = userSettings;
                    }

                    return {
                        ...rest,
                        avatarUrl: formattedUserSettings.avatarUrl,
                        nickname: formattedUserSettings.nickname,
                    };
                } catch (error) {
                    this.logService.logError(`Error getting user settings for player ${player.uid}: ${JSON.stringify(error)}`);

                    return {
                        ...rest,
                        avatarUrl: "",
                        nickname: "",
                    };
                }
            })
        );

        const player = leaderboard.leaderboard.find((x) => x.uid === uid);

        if (currentPlayerSettings == null) {
            try {
                const userSettings = await this.langliveUserSettingConsumer.getLangliveUserSettings(uid);
                currentPlayerSettings = this.formatUserSettings(userSettings);
            } catch (error) {
                this.logService.logError(`Error getting user settings for current player ${uid}: ${JSON.stringify(error)}`);
                currentPlayerSettings = null;
            }
        }

        return {
            leaderboard: enhancedLeaderboard,
            currentPlayer: {
                rank: player?.rank || -1,
                currentPlayerSettings,
                totalWin: player?.totalWin || 0,
            },
            time: leaderboard.updatedAt.toISOString(),
        };
    }

    formatUserSettings(userSettings: {
        leaderboard: {
            hideAvatar: boolean;
            hideName: boolean;
        };
        avatarUrl: string;
        nickname: string;
    }) {
        const hideAvatar = Boolean(userSettings.leaderboard.hideAvatar);
        const hideName = Boolean(userSettings.leaderboard.hideName);
        return {
            hideAvatar,
            hideName,
            avatarUrl: hideAvatar ? null : userSettings.avatarUrl,
            nickname: hideName ? null : userSettings.nickname,
        };
    }
}
