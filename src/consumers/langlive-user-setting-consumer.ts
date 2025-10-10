import { logger } from "sc-common";
import { LangliveUserSettingsModel } from "../models";
import RouletteGameDefinition from "../roulette-game-definition";
import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";

export default class LangliveUserSettingConsumer {
    definition: RouletteGameDefinition;
    gameManagementApiClient: any;
    logService: typeof logger;

    constructor({
        definition,
        gameManagementApiClientFactory,
        logService,
    }: {
        definition: RouletteGameDefinition;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        logService: typeof logger;
    }) {
        this.definition = definition;
        this.gameManagementApiClient = gameManagementApiClientFactory.instance();
        this.logService = logService;
    }

    async updateLeaderboardSettings(uid: string, payload: { hideAvatar: boolean; hideName: boolean }) {
        await LangliveUserSettingsModel.findOneAndUpdate(
            { uid, gameId: this.definition.id },
            { $set: { leaderboard: { hideAvatar: payload.hideAvatar, hideName: payload.hideName } } },
            { upsert: true }
        ).exec();
    }

    async updateImageAndNickname(uid: string, payload: { avatarUrl: string; nickname: string }) {
        const userSetting = await LangliveUserSettingsModel.updateOne(
            { uid, gameId: this.definition.id },
            { $set: { avatarUrl: payload.avatarUrl, nickname: payload.nickname } },
            { upsert: true }
        ).exec();

        if (userSetting.upsertedCount > 0) {
            const defaultSettings = await this.getDefaultLeaderboardSettings(uid);
            await LangliveUserSettingsModel.updateOne(
                { uid, gameId: this.definition.id },
                { $set: { leaderboard: defaultSettings } }
            ).exec();
        }
    }

    async getLeaderboardSettings(uid: string): Promise<{
        hideAvatar: boolean;
        hideName: boolean;
    }> {
        const userSetting = await this.getLangliveUserSettings(uid);
        return {
            hideAvatar: Boolean(userSetting.leaderboard.hideAvatar),
            hideName: Boolean(userSetting.leaderboard.hideName),
        };
    }

    async getLangliveUserSettings(uid: string): Promise<{
        avatarUrl: string;
        nickname: string;
        leaderboard: {
            hideAvatar: boolean;
            hideName: boolean;
        };
    }> {
        const projection = { _id: 0, uid: 0, gameId: 0, __v: 0 };
        const userSetting = await LangliveUserSettingsModel.findOne({ uid, gameId: this.definition.id }, projection).lean().exec();

        if (userSetting != null) {
            return userSetting;
        }

        try {
            const playerInfo = await this.getPlayerInfo(uid);
            const defaultSettings = await this.getDefaultLeaderboardSettings(uid);

            const userSettings = {
                avatarUrl: playerInfo.avatarUrl,
                nickname: playerInfo.nickname,
                leaderboard: defaultSettings,
            };

            await LangliveUserSettingsModel.updateOne({ uid, gameId: this.definition.id }, { $set: userSettings }, { upsert: true }).exec();

            return userSettings;
        } catch (error) {
            this.logService.logError(`Error creating user settings: ${JSON.stringify(error)}`);
            return {
                avatarUrl: "",
                nickname: "",
                leaderboard: { hideAvatar: false, hideName: false },
            };
        }
    }

    async getPlayerInfo(uid: string) {
        const playerInfo = await getOrDefault(this.gameManagementApiClient.users.getUserInfo(uid), {
            playerAvatarUrl: "",
            playerNickname: "",
        });
        return {
            avatarUrl: playerInfo.playerAvatarUrl,
            nickname: playerInfo.playerNickname,
        };
    }

    async getDefaultLeaderboardSettings(uid: string) {
        const otherGameSettings = await LangliveUserSettingsModel.find({
            uid,
            gameId: { $ne: this.definition.id },
        })
            .lean()
            .exec();

        let combinedSettings = { hideAvatar: false, hideName: false };

        if (otherGameSettings.length > 0) {
            combinedSettings = otherGameSettings.reduce(
                (acc, setting) => {
                    if (setting.leaderboard) {
                        acc.hideAvatar = acc.hideAvatar || !!setting.leaderboard.hideAvatar;
                        acc.hideName = acc.hideName || !!setting.leaderboard.hideName;
                    }
                    return acc;
                },
                { hideAvatar: false as boolean, hideName: false as boolean }
            );
        }

        return combinedSettings;
    }
}
