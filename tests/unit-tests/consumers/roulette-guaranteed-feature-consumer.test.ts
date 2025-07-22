import RouletteGuaranteedFeatureConsumer from "../../../src/consumers/roulette-guaranteed-feature-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import { RouletteBet, GuaranteedFeature, GuaranteedConfig, ThresholdSetting } from "../../../src/types";
import Constants from "../../../src/constants";

// Mock the helper functions
jest.mock("../../../src/helpers/day-helper", () => ({
    getStartDate: jest.fn().mockReturnValue(new Date("2025-01-01T00:00:00.000Z")),
    convertToGMTDate: jest.fn().mockImplementation((date) => {
        return new Date(date);
    }),
}));

describe("RouletteGuaranteedFeatureConsumer", () => {
    let consumer: RouletteGuaranteedFeatureConsumer;
    let mockGameData: RouletteGameData;
    let mockBet: RouletteBet;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date("2025-01-07T00:00:00.000Z"));
        mockGameData = new RouletteGameData(30000);
        mockBet = {
            uid: "user1",
            name: "Player1",
            time: new Date(),
            freeBet: false,
            roundId: 1,
        };

        consumer = new RouletteGuaranteedFeatureConsumer({ gameData: mockGameData });
    });

    describe("constructor", () => {
        it("should initialize with gameData", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteGuaranteedFeatureConsumer);
            expect(consumer.gameData).toBe(mockGameData);
        });
    });

    describe("calculateGuaranteedFeatureStatus", () => {
        it("should return null when bet has no guaranteed feature", async () => {
            // Arrange
            mockBet.guaranteedFeature = undefined;

            // Act
            const result = await consumer.calculateGuaranteedFeatureStatus(mockBet);

            // Assert
            expect(result).toBeNull();
        });

        it("should return expected result when bet has guaranteed feature", async () => {
            // Arrange
            const guaranteedFeature: GuaranteedFeature = {
                gamingDays: 3,
                totalDays: 7,
            } as GuaranteedFeature;
            mockBet.guaranteedFeature = guaranteedFeature;
            const accumulatedAmount = 10;
            const expectedResult = {
                guaranteedWinStatus: "",
                guaranteedLossStatus: "",
                winningPercentage: 0,
                isReached: false,
                accumulatedAmount,
            };
            consumer["calculatePlayerAccumulatedAmount"] = jest.fn().mockResolvedValue(accumulatedAmount);
            consumer["getApplicableGuaranteedConfig"] = jest.fn().mockReturnValue(null);
            consumer["determineGuaranteedStatus"] = jest.fn().mockReturnValue({ status: "", winningPercentage: 0 });

            // Act
            const result = await consumer.calculateGuaranteedFeatureStatus(mockBet);

            // Assert
            expect(result).toEqual(expectedResult);
        });
    });

    describe("calculatePlayerAccumulatedAmount", () => {
        describe("when data is invalid", () => {
            const testCases = [
                {
                    description: "when player has no bet history",
                    uid: "user1",
                    guaranteedFeature: null as any,
                    playerBetHistory: {},
                },
                {
                    description: "when guaranteed feature has no configs",
                    uid: "user1",
                    guaranteedFeature: null,
                    playerBetHistory: {
                        user1: [
                            {
                                totalAmount: 10,
                                betwin: 10,
                                time: new Date(),
                            } as any,
                        ],
                    },
                },
                {
                    description: "when guaranteed feature has no gaming days",
                    uid: "user1",
                    guaranteedFeature: {
                        gamingDays: 0,
                        totalDays: 7,
                    } as GuaranteedFeature,
                    playerBetHistory: {
                        user1: [
                            {
                                totalAmount: 10,
                                betwin: 10,
                                time: new Date(),
                            } as any,
                        ],
                    },
                },
                {
                    description: "when guaranteed feature has no total days",
                    uid: "user1",
                    guaranteedFeature: {
                        gamingDays: 3,
                        totalDays: 0,
                    } as GuaranteedFeature,
                    playerBetHistory: {
                        user1: [
                            {
                                totalAmount: 10,
                                betwin: 10,
                                time: new Date(),
                            } as any,
                        ],
                    },
                },
            ];

            it.each(testCases)("should return 0 when $description", async ({ uid, guaranteedFeature, playerBetHistory }) => {
                // Arrange
                mockGameData.playerBetHistory = playerBetHistory as any;

                // Act
                const result = await consumer["calculatePlayerAccumulatedAmount"](uid, guaranteedFeature);

                // Assert
                expect(result).toBe(0);
            });
        });

        it("should return accumulated amount when data is valid", async () => {
            // Arrange
            const uid = "user1";
            const guaranteedFeature: GuaranteedFeature = {
                gamingDays: 3,
                totalDays: 7,
            } as GuaranteedFeature;
            mockGameData.playerBetHistory = {
                user1: [
                    {
                        totalAmount: 10,
                        betwin: 10,
                        time: new Date(),
                    },
                ],
            } as any;
            consumer["getRecentGamingDays"] = jest.fn().mockReturnValue([
                {
                    totalAmount: 10,
                    betwin: 100,
                    time: new Date(),
                },
                {
                    totalAmount: 50,
                    betwin: 100,
                    time: new Date(),
                },
            ]);

            // Act
            const result = await consumer["calculatePlayerAccumulatedAmount"](uid, guaranteedFeature);

            // Assert
            expect(result).toBe(140);
        });
    });

    describe("getRecentGamingDays", () => {
        it("should return correct data", () => {
            // Arrange
            const uid = "user1";
            const guaranteedFeature: GuaranteedFeature = {
                gamingDays: 3,
                totalDays: 7,
            } as GuaranteedFeature;
            mockGameData.playerBetHistory = {
                user1: [
                    {
                        totalAmount: 10,
                        betwin: 100,
                        time: new Date("2025-01-01T00:00:00.000Z"),
                    },
                    {
                        totalAmount: 10,
                        betwin: 100,
                        time: new Date("2025-01-03T00:00:00.000Z"),
                    },
                    {
                        totalAmount: 20,
                        betwin: 0,
                        time: new Date("2025-01-04T00:00:00.000Z"),
                    },
                    {
                        totalAmount: 30,
                        betwin: 0,
                        time: new Date("2025-01-06T00:00:00.000Z"),
                    },
                    {
                        totalAmount: 50,
                        betwin: 100,
                        time: new Date("2025-01-06T04:00:00.000Z"),
                    },
                    {
                        totalAmount: 10,
                        betwin: 100,
                        time: new Date("2025-01-07T00:00:00.000Z"),
                    },
                ],
            } as any;

            // Act
            const result = consumer["getRecentGamingDays"](uid, guaranteedFeature);

            // Assert
            expect(result.length).toBe(5);
            expect(result[0].time).toEqual(new Date("2025-01-07T00:00:00.000Z"));
            expect(result[1].time).toEqual(new Date("2025-01-06T00:00:00.000Z"));
            expect(result[2].time).toEqual(new Date("2025-01-06T04:00:00.000Z"));
            expect(result[3].time).toEqual(new Date("2025-01-04T00:00:00.000Z"));
            expect(result[4].time).toEqual(new Date("2025-01-03T00:00:00.000Z"));
        });
    });

    describe("getApplicableGuaranteedConfig", () => {
        const guaranteedFeature: GuaranteedFeature = {
            guaranteedWin: {
                enabled: true,
                floating: 10,
                thresholdSettings: [
                    {
                        threshold: 10_000,
                        normalWinningPercentage: 80,
                        enabledWeakened: true,
                        weakenedWinningPercentage: 60,
                    },
                ],
            },
            guaranteedLoss: {
                enabled: true,
                floating: 10,
                thresholdSettings: [
                    {
                        threshold: 10_000,
                        normalWinningPercentage: 20,
                        enabledWeakened: true,
                        weakenedWinningPercentage: 40,
                    },
                ],
            },
        } as GuaranteedFeature;
        it("should return guaranteedWin when accumulated amount is less than 0", () => {
            // Arrange
            const accumulatedAmount = -10_000;

            // Act
            const result = consumer["getApplicableGuaranteedConfig"](guaranteedFeature, accumulatedAmount);

            // Assert
            expect(result).toBe(guaranteedFeature.guaranteedWin);
        });

        it("should return guaranteedWin when accumulated amount is greater than 0", () => {
            // Arrange
            const accumulatedAmount = 10_000;

            // Act
            const result = consumer["getApplicableGuaranteedConfig"](guaranteedFeature, accumulatedAmount);

            // Assert
            expect(result).toBe(guaranteedFeature.guaranteedLoss);
        });
    });

    describe("determineGuaranteedStatus", () => {
        const mockUid = "user1";
        const mockLatestBet = {
            totalAmount: 100,
            betwin: 0,
            time: new Date(),
            guaranteedWinStatus: "",
            guaranteedLossStatus: "",
            roundId: 1,
        } as any;

        describe("when config is invalid", () => {
            it("should return existed status when config is null", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const config = null;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });

            it("should return existed status when config is disabled", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const config: GuaranteedConfig = {
                    enabled: false,
                    floating: 10,
                    thresholdSettings: [],
                };

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });
        });

        describe("when no matching threshold is found", () => {
            it("should return existed status when threshold settings are empty", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [],
                };

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });

            it("should return default status when no threshold matches", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [
                        {
                            threshold: 10000,
                            normalWinningPercentage: 80,
                            enabledWeakened: true,
                            weakenedWinningPercentage: 60,
                        },
                    ],
                };

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });
        });

        describe("when no latest bet is found", () => {
            it("should return default status when player has no bet history", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [
                        {
                            threshold: 1000,
                            normalWinningPercentage: 80,
                            enabledWeakened: true,
                            weakenedWinningPercentage: 60,
                        },
                    ],
                };

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });
        });

        describe("when weakened status is reached", () => {
            it("should return weakened status when accumulatedAmount > 0 and control loss latest bet", () => {
                // Arrange
                const accumulatedAmount = 5000;
                const thresholdSetting: ThresholdSetting = {
                    threshold: 1000,
                    normalWinningPercentage: 40,
                    enabledWeakened: true,
                    weakenedWinningPercentage: 20,
                };
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [thresholdSetting],
                };
                const latestBet = {
                    ...mockLatestBet,
                    guaranteedLossStatus: Constants.guaranteedStatus.normal,
                    betwin: 0, // Loss
                };
                mockGameData.playerBetHistory = {
                    [mockUid]: [latestBet],
                } as any;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.weakened,
                    winningPercentage: thresholdSetting.weakenedWinningPercentage,
                });
            });

            it("should return weakened status when accumulatedAmount < 0 and control win latest bet", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const thresholdSetting: ThresholdSetting = {
                    threshold: 1000,
                    normalWinningPercentage: 80,
                    enabledWeakened: true,
                    weakenedWinningPercentage: 60,
                };
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [thresholdSetting],
                };
                const latestBet = {
                    ...mockLatestBet,
                    guaranteedWinStatus: Constants.guaranteedStatus.weakened,
                    betwin: mockLatestBet.totalAmount * 2, // Win
                };
                mockGameData.playerBetHistory = {
                    [mockUid]: [latestBet],
                } as any;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.weakened,
                    winningPercentage: thresholdSetting.weakenedWinningPercentage,
                });
            });
        });

        describe("when normal status is reached", () => {
            it("should return normal status when has control latest bet", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const thresholdSetting: ThresholdSetting = {
                    threshold: 1000,
                    normalWinningPercentage: 80,
                    enabledWeakened: false,
                    weakenedWinningPercentage: 60,
                };
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [thresholdSetting],
                };
                const latestBet = {
                    ...mockLatestBet,
                    guaranteedWinStatus: Constants.guaranteedStatus.normal,
                };
                mockGameData.playerBetHistory = {
                    [mockUid]: [latestBet],
                } as any;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.normal,
                    winningPercentage: thresholdSetting.normalWinningPercentage,
                });
            });

            it("should return normal status when accumulatedAmount meets normal threshold", () => {
                // Arrange
                const accumulatedAmount = -5000;
                const thresholdSetting: ThresholdSetting = {
                    threshold: 1000,
                    normalWinningPercentage: 80,
                    enabledWeakened: false,
                    weakenedWinningPercentage: 60,
                };
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [thresholdSetting],
                };
                mockGameData.playerBetHistory = {
                    [mockUid]: [mockLatestBet],
                } as any;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.normal,
                    winningPercentage: thresholdSetting.normalWinningPercentage,
                });
            });
        });

        describe("when no status is reached", () => {
            it("should return default status when neither weakened nor normal conditions are met", () => {
                // Arrange
                const accumulatedAmount = -200;
                const thresholdSetting: ThresholdSetting = {
                    threshold: 1000,
                    normalWinningPercentage: 80,
                    enabledWeakened: false,
                    weakenedWinningPercentage: 60,
                };
                const config: GuaranteedConfig = {
                    enabled: true,
                    floating: 10,
                    thresholdSettings: [thresholdSetting],
                };
                mockGameData.playerBetHistory = {
                    [mockUid]: [mockLatestBet],
                } as any;

                // Act
                const result = consumer["determineGuaranteedStatus"](mockUid, accumulatedAmount, config);

                // Assert
                expect(result).toEqual({
                    status: Constants.guaranteedStatus.exited,
                    winningPercentage: 0,
                });
            });
        });
    });
});
