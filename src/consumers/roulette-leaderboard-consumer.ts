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
        const { session, UID } = player;
        const { currencyName, operatorId } = session;
        return this.getLeaderboardByDay(new Date(), UID, payload.top, currencyName, operatorId);
    }

    async getLeaderboardByDay(date: Date, uid: string, top: number, currency: string, operatorId: string) {
        const key = date.toISOString().split("T")[0];
        const leaderboard = await RouletteLeaderboardModel.findOne(
            { date: key, currency: currency, operatorId },
            { _id: 0, __v: 0, "leaderboard._id": 0 }
        )
            .lean()
            .exec();
        let currentPlayerSettings: {
            hideAvatar: boolean;
            hideName: boolean;
            avatarUrl: string | null;
            nickname: string | null;
        } = {
            hideAvatar: false,
            hideName: false,
            avatarUrl: "",
            nickname: "",
        };

        if (!leaderboard) {
            const userSettings = await this.langliveUserSettingConsumer.getLangliveUserSettings(uid);
            currentPlayerSettings = this.formatUserSettings(userSettings);
            return { leaderboard: [], currentPlayer: { rank: -1, currentPlayerSettings, totalWin: 0 }, time: date.toISOString() };
        }

        const slicedLeaderboard = leaderboard.leaderboard.slice(0, top).filter((x) => x.totalWin > 0);

        const enhancedLeaderboard = await Promise.all(
            slicedLeaderboard.map(async (player) => {
                const { uid: _uid, ...rest } = player;
                try {
                    const userSettings = await this.langliveUserSettingConsumer.getLangliveUserSettings(player.uid);

                    const formattedUserSettings = this.formatUserSettings(userSettings);

                    if (player.uid === uid) {
                        currentPlayerSettings = formattedUserSettings;
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
        leaderboard?: {
            hideAvatar?: boolean;
            hideName?: boolean;
        };
        avatarUrl?: string;
        nickname?: string;
    }) {
        if (!userSettings || !userSettings.leaderboard) {
            return {
                hideAvatar: false,
                hideName: false,
                avatarUrl: userSettings?.avatarUrl || "",
                nickname: userSettings?.nickname || "",
            };
        }

        const hideAvatar = Boolean(userSettings.leaderboard.hideAvatar);
        const hideName = Boolean(userSettings.leaderboard.hideName);
        return {
            hideAvatar,
            hideName,
            avatarUrl: hideAvatar ? null : userSettings.avatarUrl || "",
            nickname: hideName ? null : userSettings.nickname || "",
        };
    }
}
