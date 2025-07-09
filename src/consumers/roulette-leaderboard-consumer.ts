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

    async consume(player: any, payload: { top: number }) {
        const leaderboard = await this.getLeaderboardByDay(new Date(), player.UID, payload.top);
        return leaderboard;
    }

    async getLeaderboardByDay(date: Date, uid: string, top: number) {
        const key = date.toISOString().split("T")[0];
        const leaderboard = await RouletteLeaderboardModel.findOne({ date: key }, { _id: 0, __v: 0 });
        if (!leaderboard) {
            return { leaderboard: [], playerRank: -1, time: date.toISOString() };
        }

        const slicedLeaderboard = leaderboard.leaderboard.slice(0, top);
        let currentPlayerSettings = null;

        const enhancedLeaderboard = await Promise.all(
            slicedLeaderboard.map(async (player) => {
                try {
                    // Get user settings for this player
                    const userSettings = await this.langliveUserSettingConsumer.getLeaderboardSettings(player.uid);

                    const hideAvatar = userSettings.leaderboard?.hideAvatar;
                    const hideName = userSettings.leaderboard?.hideName;

                    if (player.uid === uid) {
                        currentPlayerSettings = userSettings;
                    }

                    return {
                        ...player,
                        avatar: hideAvatar ? null : userSettings.avatarId,
                        name: hideName ? null : userSettings.playerName,
                    };
                } catch (error) {
                    // If there's an error getting user settings or player info, return player data without avatar/name
                    console.error(`Error getting user settings for player ${player.uid}:`, error);
                    return {
                        ...player,
                        avatar: null,
                        name: null,
                    };
                }
            })
        );

        const player = leaderboard.leaderboard.find((x) => x.uid === uid);

        if (currentPlayerSettings == null) {
            const userSettings = await this.langliveUserSettingConsumer.getLeaderboardSettings(uid);
            currentPlayerSettings = userSettings;
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
