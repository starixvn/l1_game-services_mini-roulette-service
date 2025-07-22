import RouletteLeaderboardAccumulator from "../../../src/crons/roulette-leaderboard-accumulator";

jest.mock("cron", () => ({
    CronJob: jest.fn().mockImplementation((config: any) => ({
        start: jest.fn(),
        onTick: config.onTick,
        onComplete: config.onComplete,
    })),
}));

jest.mock("../../../src/models", () => ({
    RouletteBets: {
        find: jest.fn(),
    },
    RouletteLeaderboardModel: {
        find: jest.fn(),
        findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn(),
        }),
    },
}));

const { RouletteBets, RouletteLeaderboardModel } = require("../../../src/models");

describe("RouletteLeaderboardAccumulator", () => {
    let accumulator: RouletteLeaderboardAccumulator;
    let mockDefinition: any;
    let mockAppConfigs: any;
    let mockLogService: any;
    let mockLangliveUserSettingConsumer: any;

    beforeEach(() => {
        mockDefinition = {
            name: "test-roulette",
        };
        mockAppConfigs = {
            cronTimeGetLeaderboard: "*/5 * * * *",
        };
        mockLogService = {
            logError: jest.fn(),
        };
        mockLangliveUserSettingConsumer = {
            getLeaderboardSettings: jest.fn(),
        };

        accumulator = new RouletteLeaderboardAccumulator({
            definition: mockDefinition,
            appConfigs: mockAppConfigs,
            logService: mockLogService,
            langliveUserSettingConsumer: mockLangliveUserSettingConsumer,
        });

        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with provided dependencies", () => {
            expect(accumulator.definition).toBe(mockDefinition);
            expect(accumulator.appConfigs).toBe(mockAppConfigs);
            expect(accumulator.logService).toBe(mockLogService);
            expect(accumulator.langliveUserSettingConsumer).toBe(mockLangliveUserSettingConsumer);
        });
    });

    describe("start", () => {
        it("should create and start a cron job with correct configuration", () => {
            const cron = require("cron");
            const mockCronJob = jest.fn();
            cron.CronJob.mockImplementation((config: any) => {
                mockCronJob.mockReturnValue({
                    start: jest.fn(),
                });
                return mockCronJob();
            });

            accumulator.start();

            expect(cron.CronJob).toHaveBeenCalledWith({
                cronTime: "*/5 * * * *",
                onTick: expect.any(Function),
                onComplete: expect.any(Function),
                start: true,
                runOnInit: true,
            });
        });

        it("should use default cron time when appConfigs.cronTimeGetLeaderboard is not provided", () => {
            const cron = require("cron");
            accumulator.appConfigs.cronTimeGetLeaderboard = undefined;

            accumulator.start();

            expect(cron.CronJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    cronTime: "*/5 * * * *",
                })
            );
        });

        it("should prevent concurrent executions when already running", async () => {
            const cron = require("cron");
            let onTickCallback: Function | undefined;
            cron.CronJob.mockImplementation((config: any) => {
                onTickCallback = config.onTick;
                return { start: jest.fn() };
            });
            accumulator.start();

            if (onTickCallback) {
                await onTickCallback();
                await onTickCallback();
            }

            expect(mockLogService.logError).toHaveBeenCalledWith(expect.stringContaining("leaderboard accumulation is already running"));
        });
    });

    describe("accumulateIncremental", () => {
        const testDate = new Date("2024-01-15T10:30:00Z");
        const startOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
        const endOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 23, 59, 59, 999);
        const dateKey = testDate.toISOString().slice(0, 10);

        beforeEach(() => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn(),
                }),
            });

            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn(),
                }),
            });
        });

        it("should handle case when no existing leaderboards and no new bets", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it("should create new leaderboard for single currency/operator when no existing data", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 100, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user2", betwin: 50, time: new Date("2024-01-15T13:00:00Z"), currency: "USD", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [
                        { uid: "user1", totalWin: 100, rank: 1 },
                        { uid: "user2", totalWin: 50, rank: 2 },
                    ],
                    updatedAt: expect.any(Date),
                    lastProcessedTime: new Date("2024-01-15T13:00:00Z"),
                },
                { upsert: true, new: true }
            );
        });

        it("should handle multiple currencies and operators", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 100, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user2", betwin: 50, time: new Date("2024-01-15T13:00:00Z"), currency: "EUR", operatorId: "op1" },
                { uid: "user3", betwin: 75, time: new Date("2024-01-15T14:00:00Z"), currency: "USD", operatorId: "op2" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledTimes(3);

            // Check USD:op1
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                expect.objectContaining({
                    leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
                }),
                { upsert: true, new: true }
            );

            // Check EUR:op1
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "EUR", operatorId: "op1" },
                expect.objectContaining({
                    leaderboard: [{ uid: "user2", totalWin: 50, rank: 1 }],
                }),
                { upsert: true, new: true }
            );

            // Check USD:op2
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op2" },
                expect.objectContaining({
                    leaderboard: [{ uid: "user3", totalWin: 75, rank: 1 }],
                }),
                { upsert: true, new: true }
            );
        });

        it("should update existing leaderboard with new bets", async () => {
            const existingLeaderboards = [
                {
                    currency: "USD",
                    operatorId: "op1",
                    lastProcessedTime: startOfDay,
                    leaderboard: [
                        { uid: "user1", totalWin: 200, rank: 1 },
                        { uid: "user2", totalWin: 100, rank: 2 },
                    ],
                },
            ];
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(existingLeaderboards),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 50, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user3", betwin: 150, time: new Date("2024-01-15T13:00:00Z"), currency: "USD", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [
                        { uid: "user1", totalWin: 250, rank: 1 },
                        { uid: "user3", totalWin: 150, rank: 2 },
                        { uid: "user2", totalWin: 100, rank: 3 },
                    ],
                    updatedAt: expect.any(Date),
                    lastProcessedTime: new Date("2024-01-15T13:00:00Z"),
                },
                { upsert: true, new: true }
            );
        });

        it("should handle multiple bets from the same user", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 100, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user1", betwin: 50, time: new Date("2024-01-15T13:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user1", betwin: 75, time: new Date("2024-01-15T14:00:00Z"), currency: "USD", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [{ uid: "user1", totalWin: 225, rank: 1 }],
                    updatedAt: expect.any(Date),
                    lastProcessedTime: new Date("2024-01-15T14:00:00Z"),
                },
                { upsert: true, new: true }
            );
        });

        it("should skip bets without currency or operatorId", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 100, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user2", betwin: 50, time: new Date("2024-01-15T13:00:00Z") }, // Missing currency/operatorId
                { uid: "user3", betwin: 75, time: new Date("2024-01-15T14:00:00Z"), currency: "EUR", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                expect.objectContaining({
                    leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
                }),
                { upsert: true, new: true }
            );
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "EUR", operatorId: "op1" },
                expect.objectContaining({
                    leaderboard: [{ uid: "user3", totalWin: 75, rank: 1 }],
                }),
                { upsert: true, new: true }
            );
        });

        it("should handle invalid betwin values", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 100, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user2", betwin: "invalid", time: new Date("2024-01-15T13:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user3", betwin: NaN, time: new Date("2024-01-15T14:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user4", betwin: 50, time: new Date("2024-01-15T15:00:00Z"), currency: "USD", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [
                        { uid: "user1", totalWin: 100, rank: 1 },
                        { uid: "user4", totalWin: 50, rank: 2 },
                        { uid: "user2", totalWin: 0, rank: 3 },
                        { uid: "user3", totalWin: 0, rank: 4 },
                    ],
                    updatedAt: expect.any(Date),
                    lastProcessedTime: new Date("2024-01-15T15:00:00Z"),
                },
                { upsert: true, new: true }
            );
        });

        it("should only process bets after lastProcessedTime", async () => {
            const lastProcessedTime = new Date("2024-01-15T11:00:00Z");
            const existingLeaderboards = [
                {
                    currency: "USD",
                    operatorId: "op1",
                    lastProcessedTime,
                    leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
                },
            ];
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(existingLeaderboards),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 50, time: new Date("2024-01-15T10:00:00Z"), currency: "USD", operatorId: "op1" }, // Before lastProcessedTime
                { uid: "user2", betwin: 75, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" }, // After lastProcessedTime
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [
                        { uid: "user1", totalWin: 100, rank: 1 },
                        { uid: "user2", totalWin: 75, rank: 2 },
                    ],
                    updatedAt: expect.any(Date),
                    lastProcessedTime: new Date("2024-01-15T12:00:00Z"),
                },
                { upsert: true, new: true }
            );
        });

        it("should sort leaderboard by totalWin in descending order", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            const mockBets = [
                { uid: "user1", betwin: 50, time: new Date("2024-01-15T12:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user2", betwin: 100, time: new Date("2024-01-15T13:00:00Z"), currency: "USD", operatorId: "op1" },
                { uid: "user3", betwin: 75, time: new Date("2024-01-15T14:00:00Z"), currency: "USD", operatorId: "op1" },
            ];
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBets),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                expect.objectContaining({
                    leaderboard: [
                        { uid: "user2", totalWin: 100, rank: 1 },
                        { uid: "user3", totalWin: 75, rank: 2 },
                        { uid: "user1", totalWin: 50, rank: 3 },
                    ],
                }),
                { upsert: true, new: true }
            );
        });

        it("should update existing leaderboards even when no new bets", async () => {
            const existingLeaderboards = [
                {
                    currency: "USD",
                    operatorId: "op1",
                    lastProcessedTime: startOfDay,
                    leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
                },
                {
                    currency: "EUR",
                    operatorId: "op1",
                    lastProcessedTime: startOfDay,
                    leaderboard: [{ uid: "user2", totalWin: 50, rank: 1 }],
                },
            ];
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(existingLeaderboards),
                }),
            });
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "USD", operatorId: "op1" },
                {
                    leaderboard: [{ uid: "user1", totalWin: 100, rank: 1 }],
                    updatedAt: expect.any(Date),
                },
                { upsert: true }
            );
            expect(RouletteLeaderboardModel.findOneAndUpdate).toHaveBeenCalledWith(
                { date: dateKey, currency: "EUR", operatorId: "op1" },
                {
                    leaderboard: [{ uid: "user2", totalWin: 50, rank: 1 }],
                    updatedAt: expect.any(Date),
                },
                { upsert: true }
            );
        });

        it("should handle database errors gracefully", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
            });

            await expect(accumulator.accumulateIncremental(testDate)).rejects.toThrow("Database error");
        });

        it("should query all bets for the day", async () => {
            (RouletteLeaderboardModel.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });
            (RouletteBets.find as jest.Mock).mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            await accumulator.accumulateIncremental(testDate);

            expect(RouletteBets.find).toHaveBeenCalledWith({
                paid: true,
                time: { $gte: startOfDay, $lte: endOfDay },
            });
        });
    });
});
