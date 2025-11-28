import { logger } from "sc-common";
import { RouletteLeaderboardModel } from "../models";
import { RouletteGameData } from "../roulette-game-data";
import LangliveUserSettingConsumer from "./langlive-user-setting-consumer";
import { getWeekRange, convertToGMTDate } from "../helpers/day-helper";

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

    async consume(player: any, payload: { top: number } = { top: 100 }) {
        const { session, UID } = player;
        const { currencyName, operatorId } = session;
        const { start, end } = getWeekRange(new Date());
        return this.getLeaderboardByWeekRange(start, end, UID, payload.top, currencyName, operatorId);
    }

    async getLeaderboardByWeekRange(start: Date, end: Date, uid: string, top: number, currency: string, operatorId: string) {
        const dateKeys: string[] = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const gmt8Date = convertToGMTDate(currentDate, 8);
            dateKeys.push(gmt8Date.toISOString().split("T")[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const leaderboards = await RouletteLeaderboardModel.find(
            { date: { $in: dateKeys }, currency: currency, operatorId },
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

        if (!leaderboards || leaderboards.length === 0) {
            const userSettings = await this.langliveUserSettingConsumer.getLangliveUserSettings(uid);
            currentPlayerSettings = this.formatUserSettings(userSettings);
            return { 
                leaderboard: [], 
                currentPlayer: { rank: -1, currentPlayerSettings, totalWin: 0 }, 
                time: new Date().toISOString(),
                timeRange: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
            };
        }

        const playerWinMap = new Map<string, { uid: string; totalWin: number }>();
        
        leaderboards.forEach((dailyLeaderboard) => {
            dailyLeaderboard.leaderboard.forEach((player) => {
                if (player.totalWin > 0) {
                    const existing = playerWinMap.get(player.uid);
                    if (existing) {
                        existing.totalWin += player.totalWin;
                    } else {
                        playerWinMap.set(player.uid, {
                            uid: player.uid,
                            totalWin: player.totalWin,
                        });
                    }
                }
            });
        });

        const mergedLeaderboard = Array.from(playerWinMap.values()).sort((a, b) => b.totalWin - a.totalWin);
        const rankedLeaderboard = mergedLeaderboard.map((player, index) => ({
            ...player,
            rank: index + 1,
        }));

        const slicedLeaderboard = rankedLeaderboard.slice(0, top).filter((x) => x.totalWin > 0);

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

        const player = rankedLeaderboard.find((x) => x.uid === uid);

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
            time: new Date().toISOString(),
            timeRange: {
                start: start.toISOString(),
                end: end.toISOString(),
            },
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
