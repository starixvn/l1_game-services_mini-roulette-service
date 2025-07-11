import { logger } from "sc-common";
import { RouletteLeaderboardModel } from "../models";
import { RouletteGameData } from "../roulette-game-data";
import LangliveUserSettingConsumer from "./langlive-user-setting-consumer";

export default class RouletteLeaderboardConsumer {
    gameData: RouletteGameData;
    langliveUserSettingConsumer: LangliveUserSettingConsumer;

    constructor({
        gameData,
        langliveUserSettingConsumer,
    }: {
        gameData: RouletteGameData;
        langliveUserSettingConsumer: LangliveUserSettingConsumer;
    }) {
        this.gameData = gameData;
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
    }

    async consume(player: any, payload: { top: number } = { top: 30 }) {
        const leaderboard = await this.getLeaderboardByDay(new Date(), player.UID, payload.top);
        return leaderboard;
    }

    async getLeaderboardByDay(date: Date, uid: string, top: number) {
        const key = date.toISOString().split("T")[0];
        const leaderboard = await RouletteLeaderboardModel.findOne({ date: key }, { _id: 0, __v: 0, "leaderboard._id": 0 }).lean();
        if (!leaderboard) {
            return { leaderboard: [], currentPlayer: { rank: -1, currentPlayerSettings: null }, time: date.toISOString() };
        }

        const slicedLeaderboard = leaderboard.leaderboard.slice(0, top);
        let currentPlayerSettings = null;

        const enhancedLeaderboard = await Promise.all(
            slicedLeaderboard.map(async (player) => {
                try {
                    const userSettings = await this.langliveUserSettingConsumer.getLeaderboardSettings(player.uid);

                    const hideAvatar = userSettings?.leaderboard?.hideAvatar;
                    const hideName = userSettings?.leaderboard?.hideName;

                    if (player.uid === uid) {
                        currentPlayerSettings = userSettings;
                    }

                    return {
                        ...player,
                        avatarUrl: hideAvatar ? null : userSettings?.avatarUrl || null,
                        nickname: hideName ? null : userSettings?.nickname || null,
                    };
                } catch (error) {
                    logger.logWarning(`Error getting user settings for player ${player.uid}: ${JSON.stringify(error)}`);
                    return {
                        ...player,
                        avatarUrl: null,
                        nickname: null,
                    };
                }
            })
        );

        const player = leaderboard.leaderboard.find((x) => x.uid === uid);

        if (currentPlayerSettings == null) {
            try {
                const userSettings = await this.langliveUserSettingConsumer.getLeaderboardSettings(uid);
                currentPlayerSettings = userSettings;
            } catch (error) {
                logger.logWarning(`Error getting user settings for current player ${uid}: ${JSON.stringify(error)}`);
                currentPlayerSettings = null;
            }
        }

        return {
            leaderboard: enhancedLeaderboard,
            currentPlayer: {
                rank: player?.rank,
                currentPlayerSettings,
            },
            time: leaderboard.updatedAt.toISOString(),
        };
    }
}
