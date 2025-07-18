import RouletteGuaranteedFeatureConsumer from "../../../src/consumers/roulette-guaranteed-feature-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import { RouletteBet, GuaranteedFeature, GuaranteedConfig, ThresholdSetting } from "../../../src/types";
import Constants from "../../../src/constants";

// Mock the helper functions
jest.mock("../../../src/helpers/day-helper", () => ({
    getStartDate: jest.fn().mockReturnValue(new Date("2023-01-01T00:00:00.000Z")),
    convertToGMTDate: jest.fn().mockImplementation((date) => {
        const mockDate = new Date(date);
        mockDate.setHours(mockDate.getHours() + 8); // Mock GMT+8 conversion
        return mockDate;
    }),
}));

describe("RouletteGuaranteedFeatureConsumer", () => {
    let consumer: RouletteGuaranteedFeatureConsumer;
    let mockGameData: RouletteGameData;
    let mockBet: RouletteBet;

    beforeEach(() => {
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
});
