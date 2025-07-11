import { LangliveUserSettingsModel } from "../models";
import RouletteGameDefinition from "../roulette-game-definition";
import GameManagementApiClientFactory, { getOrDefault } from "sc-game-base/src/core/game-management-api";

export default class LangliveUserSettingConsumer {
    definition: RouletteGameDefinition;
    gameManagementApiClient: any;

    constructor({
        definition,
        gameManagementApiClientFactory,
    }: {
        definition: RouletteGameDefinition;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
    }) {
        this.definition = definition;
        this.gameManagementApiClient = gameManagementApiClientFactory.instance();
    }

    async updateLeaderboardSettings(player: any, payload: { hideAvatar: boolean; hideName: boolean }) {
        await LangliveUserSettingsModel.findOneAndUpdate(
            { uid: player.UID, gameId: this.definition.id },
            { $set: { leaderboard: { hideAvatar: payload.hideAvatar ? 1 : 0, hideName: payload.hideName ? 1 : 0 } } },
            { upsert: true }
        );
    }

    async updateImageAndNickname(uid: string, payload: { avatarUrl: string; nickname: string }) {
        const userSetting = await LangliveUserSettingsModel.updateOne(
            { uid, gameId: this.definition.id },
            { $set: { avatarUrl: payload.avatarUrl, nickname: payload.nickname } },
            { upsert: true }
        );

        if (userSetting.upserted) {
            const defaultSettings = await this.getDefaultLeaderboardSettings(uid);
            await LangliveUserSettingsModel.updateOne({ uid, gameId: this.definition.id }, { $set: { leaderboard: defaultSettings } });
        }
    }

    async getLeaderboardSettings(uid: string): Promise<{
        avatarUrl: string;
        nickname: string;
        leaderboard: {
            hideAvatar: number;
            hideName: number;
        };
    }> {
        const projection = { _id: 0, leaderboard: 1 };
        const userSetting = await LangliveUserSettingsModel.findOne({ uid, gameId: this.definition.id }, projection);

        if (userSetting != null) {
            return userSetting;
        }

        const playerInfo = await this.getPlayerInfo(uid);

        const defaultSettings = await this.getDefaultLeaderboardSettings(uid);

        const userSettingLanglive = await LangliveUserSettingsModel.create({
            uid,
            gameId: this.definition.id,
            leaderboard: defaultSettings,
            updatedAt: new Date(),
            nickname: playerInfo.nickname,
            avatarUrl: playerInfo.avatarUrl,
        });

        const { _id, __v, ...userSettingWithoutId } = userSettingLanglive.toObject();
        return userSettingWithoutId;
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
        });

        let combinedSettings = { hideAvatar: 0, hideName: 0 };

        if (otherGameSettings.length > 0) {
            combinedSettings = otherGameSettings.reduce(
                (acc, setting) => {
                    if (setting.leaderboard) {
                        acc.hideAvatar = acc.hideAvatar | (setting.leaderboard.hideAvatar || 0);
                        acc.hideName = acc.hideName | (setting.leaderboard.hideName || 0);
                    }
                    return acc;
                },
                { hideAvatar: 0, hideName: 0 }
            );
        }

        return combinedSettings;
    }
}
