const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockUpdateOne = jest.fn();

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
        updateOne: mockUpdateOne,
    },
}));

describe("LangliveUserSettingConsumer", () => {
    let consumer: LangliveUserSettingConsumer;
    let definition: any;
    let gameManagementApiClientFactory: any;
    let gameManagementApiClient: any;

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
        consumer = new LangliveUserSettingConsumer({ definition, gameManagementApiClientFactory });
    });

    it("should be defined", () => {
        expect(consumer).toBeDefined();
    });

    describe("updateLeaderboardSettings", () => {
        it("should call updateOne with correct params", async () => {
            const payload = { hideAvatar: true, hideName: false };
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
            mockUpdateOne.mockResolvedValueOnce({ upserted: false });
            await consumer.updateImageAndNickname("user2", { avatarUrl: "url", nickname: "nick" });
            expect(mockUpdateOne).toHaveBeenCalledWith(
                { uid: "user2", gameId: definition.id },
                { $set: { avatarUrl: "url", nickname: "nick" } },
                { upsert: true }
            );
        });

        it("should call getDefaultLeaderboardSettings if upserted is true", async () => {
            mockUpdateOne.mockResolvedValueOnce({ upserted: true });
            jest.spyOn(consumer, "getDefaultLeaderboardSettings").mockResolvedValueOnce({ hideAvatar: 0, hideName: 0 });
            await consumer.updateImageAndNickname("user2", { avatarUrl: "url", nickname: "nick" });
            expect(mockUpdateOne).toHaveBeenCalledTimes(2);
        });
    });

    describe("getLeaderboardSettings", () => {
        it("should return userSetting if found", async () => {
            const userSetting = { avatarUrl: "a", nickname: "n", leaderboard: { hideAvatar: 1, hideName: 0 } };
            const exec = jest.fn().mockResolvedValueOnce(userSetting);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFindOne.mockReturnValueOnce({ lean });
            const result = await consumer.getLeaderboardSettings("user3");
            expect(lean).toHaveBeenCalled();
            expect(exec).toHaveBeenCalled();
            expect(result).toBe(userSetting);
        });

        it("should create default settings if none found", async () => {
            const exec = jest.fn().mockResolvedValueOnce(null);
            const lean = jest.fn().mockReturnValueOnce({ exec });
            mockFindOne.mockReturnValueOnce({ lean });
            mockFind.mockResolvedValueOnce([]);
            jest.spyOn(consumer, "getPlayerInfo").mockResolvedValueOnce({ avatarUrl: "a", nickname: "n" });
            mockCreate.mockResolvedValueOnce({
                toJSON: () => ({
                    avatarUrl: "a",
                    nickname: "n",
                    leaderboard: { hideAvatar: 0, hideName: 0 },
                    gameId: definition.id,
                    uid: "user5",
                    updatedAt: new Date(),
                }),
            });
            jest.spyOn(consumer, "getDefaultLeaderboardSettings").mockResolvedValueOnce({ hideAvatar: 0, hideName: 0 });
            const result = await consumer.getLeaderboardSettings("user5");
            expect(result).toMatchObject({
                avatarUrl: "a",
                nickname: "n",
                leaderboard: { hideAvatar: 0, hideName: 0 },
            });
            expect(mockCreate).toHaveBeenCalled();
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
