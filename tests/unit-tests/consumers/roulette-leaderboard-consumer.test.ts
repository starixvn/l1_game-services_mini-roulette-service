import RouletteLeaderboardConsumer from "../../../src/consumers/roulette-leaderboard-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";

jest.mock("../../../src/models", () => ({
    RouletteLeaderboardModel: {
        findOne: jest.fn(),
    },
}));

const { RouletteLeaderboardModel } = require("../../../src/models");

describe("RouletteLeaderboardConsumer", () => {
    let consumer: RouletteLeaderboardConsumer;
    let mockGameData: any;
    let mockLangliveUserSettingConsumer: any;
    let logService: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(60);
        mockLangliveUserSettingConsumer = {
            getLeaderboardSettings: jest.fn(),
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
        (RouletteLeaderboardModel.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        });
        const player = { UID: "user1" };

        const result = await consumer.consume(player, { top: 10 });

        expect(result.leaderboard).toEqual([]);
        expect(result.currentPlayer.rank).toBe(-1);
        expect(typeof result.time).toBe("string");
    });

    it("should return leaderboard with enhanced player info", async () => {
        const leaderboardDoc = {
            leaderboard: [
                { uid: "user1", totalWin: 100, rank: 1 },
                { uid: "user2", totalWin: 50, rank: 2 },
            ],
            updatedAt: new Date(),
        };
        (RouletteLeaderboardModel.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue(leaderboardDoc),
        });
        mockLangliveUserSettingConsumer.getLeaderboardSettings.mockResolvedValue(
            new Promise((resolve) =>
                resolve({
                    avatarUrl: `avatar_user1`,
                    nickname: `nick_user1`,
                    leaderboard: { hideAvatar: 0, hideName: 0 },
                })
            )
        );
        const player = { UID: "user1" };

        const result = await consumer.consume(player, { top: 2 });

        expect(result.leaderboard[0].avatarUrl).toBe("avatar_user1");
        expect(result.leaderboard[0].nickname).toBe("nick_user1");
    });

    it("should handle user settings with hideAvatar/hideName", async () => {
        const leaderboardDoc = {
            leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
            updatedAt: new Date(),
        };
        (RouletteLeaderboardModel.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue(leaderboardDoc),
        });
        mockLangliveUserSettingConsumer.getLeaderboardSettings.mockResolvedValue({
            avatarUrl: "avatar_user1",
            nickname: "nick_user1",
            leaderboard: { hideAvatar: 1, hideName: 1 },
        });
        const player = { UID: "user1" };

        const result = await consumer.consume(player, { top: 1 });

        expect(result.leaderboard[0].avatarUrl).toBeNull();
        expect(result.leaderboard[0].nickname).toBeNull();
    });

    it("should handle error in getLeaderboardSettings gracefully", async () => {
        const leaderboardDoc = {
            leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
            updatedAt: new Date(),
        };
        (RouletteLeaderboardModel.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue(leaderboardDoc),
        });
        mockLangliveUserSettingConsumer.getLeaderboardSettings.mockRejectedValue(new Error("fail"));
        const player = { UID: "user1" };

        const result = await consumer.consume(player, { top: 1 });

        expect(result.leaderboard[0].avatarUrl).toBe("");
        expect(result.leaderboard[0].nickname).toBe("");
    });
});
