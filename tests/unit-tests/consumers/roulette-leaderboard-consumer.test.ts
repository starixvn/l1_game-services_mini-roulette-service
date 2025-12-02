import RouletteLeaderboardConsumer from "../../../src/consumers/roulette-leaderboard-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";

jest.mock("../../../src/models", () => ({
    RouletteLeaderboardModel: {
        find: jest.fn(),
    },
}));

const { RouletteLeaderboardModel } = require("../../../src/models");

const mockFindLeanExec = (result: any) => {
    (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(result),
        }),
    });
};

const expectLeaderboardFindCall = () => {
    expect(RouletteLeaderboardModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
            date: expect.objectContaining({
                $in: expect.any(Array),
            }),
            currency: "USD",
            operatorId: "test-operator",
        }),
        { _id: 0, __v: 0, "leaderboard._id": 0 }
    );
};

describe("RouletteLeaderboardConsumer", () => {
    let consumer: RouletteLeaderboardConsumer;
    let mockGameData: any;
    let mockLangliveUserSettingConsumer: any;
    let logService: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(60);
        mockLangliveUserSettingConsumer = {
            getLangliveUserSettings: jest.fn(),
        };
        logService = {
            logError: jest.fn(),
        };
        consumer = new RouletteLeaderboardConsumer({
            gameData: mockGameData,
            langliveUserSettingConsumer: mockLangliveUserSettingConsumer,
            logService,
        });
        jest.clearAllMocks();
    });

    it("should return default values if no leaderboard found", async () => {
        mockFindLeanExec([]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockResolvedValue({
            avatarUrl: "default_avatar",
            nickname: "default_nick",
            leaderboard: { hideAvatar: 0, hideName: 0 },
        });
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 10 });

        expectLeaderboardFindCall();
        expect(result.leaderboard).toEqual([]);
        expect(result.currentPlayer.rank).toBe(-1);
    });

    it("should return leaderboard with enhanced player info", async () => {
        const leaderboardDoc = {
            leaderboard: [
                { uid: "user1", totalWin: 100, rank: 1 },
                { uid: "user2", totalWin: 50, rank: 2 },
            ],
            updatedAt: new Date(),
        };
        mockFindLeanExec([leaderboardDoc]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockResolvedValue(
            new Promise((resolve) =>
                resolve({
                    avatarUrl: `avatar_user1`,
                    nickname: `nick_user1`,
                    leaderboard: { hideAvatar: 0, hideName: 0 },
                })
            )
        );
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 2 });

        expectLeaderboardFindCall();
        expect(result.leaderboard[0].avatarUrl).toBe("avatar_user1");
        expect(result.leaderboard[0].nickname).toBe("nick_user1");
    });

    it("should handle user settings with hideAvatar/hideName", async () => {
        const leaderboardDoc = {
            leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
            updatedAt: new Date(),
        };
        mockFindLeanExec([leaderboardDoc]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockResolvedValue({
            avatarUrl: "avatar_user1",
            nickname: "nick_user1",
            leaderboard: { hideAvatar: 1, hideName: 1 },
        });
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 1 });

        expectLeaderboardFindCall();
        expect(result.leaderboard[0].avatarUrl).toBeNull();
        expect(result.leaderboard[0].nickname).toBeNull();
    });

    it("should handle error in getLangliveUserSettings gracefully", async () => {
        const leaderboardDoc = {
            leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
            updatedAt: new Date(),
        };
        mockFindLeanExec([leaderboardDoc]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockRejectedValue(new Error("fail"));
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 1 });

        expectLeaderboardFindCall();
        expect(result.leaderboard[0].avatarUrl).toBe("");
        expect(result.leaderboard[0].nickname).toBe("");
    });

    it("should return correct current player, no need to hide player info", async () => {
        const leaderboardDoc = {
            leaderboard: [
                { uid: "user1", totalWin: 100, rank: 1 },
                { uid: "user2", totalWin: 50, rank: 2 },
            ],
            updatedAt: new Date(),
        };
        mockFindLeanExec([leaderboardDoc]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockResolvedValue({
            avatarUrl: "avatar_user1",
            nickname: "nick_user1",
            leaderboard: { hideAvatar: 1, hideName: 1 },
        });
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 1 });

        expectLeaderboardFindCall();
        expect(result.currentPlayer).toMatchObject({
            rank: 1,
            currentPlayerSettings: {
                avatarUrl: "avatar_user1",
                nickname: "nick_user1",
                hideAvatar: false,
                hideName: false,
            },
        });
    });

    it("should only include top N players with totalWin > 0", async () => {
        const leaderboardDoc = {
            leaderboard: [
                { uid: "user1", totalWin: 100, rank: 1 },
                { uid: "user2", totalWin: 50, rank: 2 },
                { uid: "user3", totalWin: 30, rank: 3 },
                { uid: "user4", totalWin: 0, rank: 4 },
            ],
            updatedAt: new Date(),
        };
        mockFindLeanExec([leaderboardDoc]);
        mockLangliveUserSettingConsumer.getLangliveUserSettings.mockResolvedValue({
            avatarUrl: "avatar",
            nickname: "nick",
            leaderboard: { hideAvatar: 0, hideName: 0 },
        });
        const player = {
            UID: "user1",
            session: {
                currencyName: "USD",
                operatorId: "test-operator",
            },
        };

        const result = await consumer.consume(player, { top: 4 });

        expectLeaderboardFindCall();
        expect(result.leaderboard.length).toBe(3);
    });
});
