const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();

jest.mock("sc-game-base/src/core/game-management-api", () => ({
    getOrDefault: (promise: any, defaultValue: any) => promise.then((v: any) => v).catch(() => defaultValue),
}));

import LangliveUserSettingConsumer from "../../../src/consumers/langlive-user-setting-consumer";

jest.mock("../../../src/models", () => ({
    LangliveUserSettingsModel: {
        findOneAndUpdate: mockFindOneAndUpdate,
        findOne: mockFindOne,
        find: mockFind,
        create: mockCreate,
        updateOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ upserted: false }),
        }),
    },
}));

describe("LangliveUserSettingConsumer", () => {
    let consumer: LangliveUserSettingConsumer;
    let definition: any;
    let gameManagementApiClientFactory: any;
    let gameManagementApiClient: any;
    let logService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        definition = { id: 123 };
        gameManagementApiClient = {
            users: {
                getUserInfo: jest.fn(),
            },
        };
        gameManagementApiClientFactory = {
            instance: () => gameManagementApiClient,
        };
        logService = {
            logError: jest.fn(),
        };
        consumer = new LangliveUserSettingConsumer({ definition, gameManagementApiClientFactory, logService });
    });

    it("should be defined", () => {
        expect(consumer).toBeDefined();
    });

    describe("updateLeaderboardSettings", () => {
        it("should call updateOne with correct params", async () => {
            const payload = { hideAvatar: true, hideName: false };
            mockFindOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

            await consumer.updateLeaderboardSettings("user1", payload);

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { uid: "user1", gameId: definition.id },
                { $set: { leaderboard: { hideAvatar: 1, hideName: 0 } } },
                { upsert: true }
            );
        });
    });

    describe("getDefaultLeaderboardSettings", () => {
        it("should combine settings from other games using bitwise OR", async () => {
            const exec = jest
                .fn()
                .mockResolvedValueOnce([{ leaderboard: { hideAvatar: 1, hideName: 0 } }, { leaderboard: { hideAvatar: 0, hideName: 1 } }]);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFind.mockReturnValueOnce({ lean });

            const result = await consumer.getDefaultLeaderboardSettings("user1");

            expect(result).toEqual({ hideAvatar: 1, hideName: 1 });
        });

        it("should return default if no other game settings exist", async () => {
            const exec = jest.fn().mockResolvedValueOnce([]);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFind.mockReturnValueOnce({ lean });

            const result = await consumer.getDefaultLeaderboardSettings("user2");

            expect(result).toEqual({ hideAvatar: 0, hideName: 0 });
        });
    });

    describe("updateImageAndNickname", () => {
        it("should call updateOne with correct params", async () => {
            const mockExec = jest.fn().mockResolvedValue({ upserted: false });
            const mockUpdateOneWithExec = jest.fn().mockReturnValue({ exec: mockExec });
            const originalUpdateOne = require("../../../src/models").LangliveUserSettingsModel.updateOne;
            require("../../../src/models").LangliveUserSettingsModel.updateOne = mockUpdateOneWithExec;

            await consumer.updateImageAndNickname("user2", { avatarUrl: "url", nickname: "nick" });

            expect(mockUpdateOneWithExec).toHaveBeenCalledWith(
                { uid: "user2", gameId: definition.id },
                { $set: { avatarUrl: "url", nickname: "nick" } },
                { upsert: true }
            );

            require("../../../src/models").LangliveUserSettingsModel.updateOne = originalUpdateOne;
        });

        it("should call updateOne 2 times if upserted is true", async () => {
            const mockExec = jest.fn().mockResolvedValue({ upserted: true });
            const mockUpdateOneWithExec = jest.fn().mockReturnValue({ exec: mockExec });
            const originalUpdateOne = require("../../../src/models").LangliveUserSettingsModel.updateOne;
            require("../../../src/models").LangliveUserSettingsModel.updateOne = mockUpdateOneWithExec;
            jest.spyOn(consumer, "getDefaultLeaderboardSettings").mockResolvedValueOnce({ hideAvatar: 0, hideName: 0 });

            await consumer.updateImageAndNickname("user2", { avatarUrl: "url", nickname: "nick" });

            expect(mockUpdateOneWithExec).toHaveBeenCalledTimes(2);

            require("../../../src/models").LangliveUserSettingsModel.updateOne = originalUpdateOne;
        });
    });

    describe("getLangliveUserSettings", () => {
        it("should return userSetting if found", async () => {
            const userSetting = { avatarUrl: "a", nickname: "n", leaderboard: { hideAvatar: 1, hideName: 0 } };
            const exec = jest.fn().mockResolvedValueOnce(userSetting);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFindOne.mockReturnValueOnce({ lean });

            const result = await consumer.getLangliveUserSettings("user3");

            expect(lean).toHaveBeenCalled();
            expect(exec).toHaveBeenCalled();
            expect(result).toBe(userSetting);
        });

        it("should create default settings if none found", async () => {
            const exec = jest.fn().mockResolvedValueOnce(null);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFindOne.mockReturnValueOnce({ lean });
            mockFind.mockResolvedValueOnce([]);
            gameManagementApiClient.users.getUserInfo.mockResolvedValueOnce({
                playerAvatarUrl: "a",
                playerNickname: "n",
            });
            const mockExec = jest.fn().mockResolvedValue({});
            const mockUpdateOneWithExec = jest.fn().mockReturnValue({ exec: mockExec });
            const originalUpdateOne = require("../../../src/models").LangliveUserSettingsModel.updateOne;
            require("../../../src/models").LangliveUserSettingsModel.updateOne = mockUpdateOneWithExec;
            jest.spyOn(consumer, "getDefaultLeaderboardSettings").mockResolvedValueOnce({ hideAvatar: 0, hideName: 0 });

            const result = await consumer.getLangliveUserSettings("user5");

            expect(result).toMatchObject({
                avatarUrl: "a",
                nickname: "n",
                leaderboard: { hideAvatar: 0, hideName: 0 },
            });
            expect(mockUpdateOneWithExec).toHaveBeenCalled();

            require("../../../src/models").LangliveUserSettingsModel.updateOne = originalUpdateOne;
        });
    });

    describe("getPlayerInfo", () => {
        it("should return player info from api client", async () => {
            gameManagementApiClient.users.getUserInfo.mockResolvedValueOnce({
                playerAvatarUrl: "avatar",
                playerNickname: "nick",
            });

            const result = await consumer.getPlayerInfo("uid123");

            expect(result).toEqual({ avatarUrl: "avatar", nickname: "nick" });
        });

        it("should return default values if api client fails", async () => {
            gameManagementApiClient.users.getUserInfo.mockRejectedValueOnce(new Error("fail"));

            const result = await consumer.getPlayerInfo("uid456");

            expect(result).toEqual({ avatarUrl: "", nickname: "" });
        });
    });
});
