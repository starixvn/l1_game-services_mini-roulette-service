import RouletteRoundResultConsumer from "../../../src/consumers/roulette-round-result-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteGameDefinition from "../../../src/roulette-game-definition";
import { RouletteBet, GuaranteedStatus } from "../../../src/types";

// Mock the game definition
jest.mock("../../../src/roulette-game-definition", () => {
    return jest.fn().mockImplementation(() => ({
        controlResultByBet: jest.fn().mockReturnValue(15),
        generateResult: jest.fn().mockReturnValue(20),
    }));
});

describe("RouletteRoundResultConsumer", () => {
    let consumer: RouletteRoundResultConsumer;
    let mockGameData: RouletteGameData;
    let mockDefinition: RouletteGameDefinition;
    let mockBet: RouletteBet;

    beforeEach(() => {
        mockGameData = new RouletteGameData(30000);
        mockDefinition = new RouletteGameDefinition({} as any, jest.fn(), jest.fn(), jest.fn(), jest.fn());
        mockBet = {
            uid: "user1",
            name: "Player1",
            time: new Date(),
            freeBet: false,
            roundId: 1,
        };

        consumer = new RouletteRoundResultConsumer({
            definition: mockDefinition,
            gameData: mockGameData,
        });
    });

    describe("constructor", () => {
        it("should initialize with definition and gameData", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteRoundResultConsumer);
            expect(consumer.definition).toBe(mockDefinition);
            expect(consumer.gameData).toBe(mockGameData);
        });
    });

    describe("generateResult", () => {
        it("should return result from admin when available for the player", async () => {
            // Arrange
            const adminResult = 25;
            mockGameData.settlementResultFromAdmin = {
                playerName: "Player1",
                result: adminResult,
            };

            // Act
            const result = await consumer.generateResult(mockBet, null);

            // Assert
            expect(result).toBe(adminResult);
        });

        it("should clear admin result after returning it", async () => {
            // Arrange
            mockGameData.settlementResultFromAdmin = {
                playerName: "Player1",
                result: 25,
            };

            // Act
            await consumer.generateResult(mockBet, null);

            // Assert
            expect(mockGameData.settlementResultFromAdmin).toEqual({});
        });

        it("should return controlled result when guaranteed feature is reached", async () => {
            // Arrange
            const guaranteedStatus: GuaranteedStatus = {
                guaranteedWinStatus: "normal",
                guaranteedLossStatus: "",
                winningPercentage: 80,
                isReached: true,
                accumulatedAmount: -100,
            };
            mockGameData.gameConfigs = { randomMode: 1 } as any;
            mockDefinition.controlResultByBet = jest.fn().mockReturnValue(15);

            // Act
            const result = await consumer.generateResult(mockBet, guaranteedStatus);

            // Assert
            expect(mockDefinition.controlResultByBet).toHaveBeenCalledWith(mockBet, 80, 1);
            expect(result).toBe(15);
        });

        it("should return normal result when guaranteed feature is not reached", async () => {
            // Arrange
            const guaranteedStatus: GuaranteedStatus = {
                guaranteedWinStatus: "",
                guaranteedLossStatus: "",
                winningPercentage: 0,
                isReached: false,
                accumulatedAmount: 0,
            };
            mockGameData.gameConfigs = { randomMode: 1 } as any;
            mockDefinition.generateResult = jest.fn().mockReturnValue(20);

            // Act
            const result = await consumer.generateResult(mockBet, guaranteedStatus);

            // Assert
            expect(mockDefinition.generateResult).toHaveBeenCalledWith(1);
            expect(result).toBe(20);
        });

        it("should return normal result when no guaranteed status is provided", async () => {
            // Arrange
            mockGameData.gameConfigs = { randomMode: 1 } as any;
            mockDefinition.generateResult = jest.fn().mockReturnValue(20);

            // Act
            const result = await consumer.generateResult(mockBet, null);

            // Assert
            expect(mockDefinition.generateResult).toHaveBeenCalledWith(1);
            expect(result).toBe(20);
        });
    });
});
