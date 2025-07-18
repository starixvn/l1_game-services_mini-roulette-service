import RouletteOutGameConsumer from "../../../src/consumers/roulette-out-game-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import SettleGameRoundConsumer from "../../../src/consumers/roulette-settle-game-round-consumer";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Core: {
        BaseEventConsumers: {
            UserDisconnectConsumer: class {
                gameData: any;
                constructor(gameData: any) {
                    this.gameData = gameData;
                }
                async consume(socketClient: any) {
                    // Mock implementation
                }
            },
        },
    },
    Table: {
        TableGameData: class {},
    },
}));

// Mock the logger
jest.mock("sc-common", () => ({
    logger: {
        logError: jest.fn(),
    },
}));

describe("RouletteOutGameConsumer", () => {
    let consumer: RouletteOutGameConsumer;
    let mockGameData: RouletteGameData;
    let mockSettleGameRoundConsumer: any;
    let mockLogService: any;
    let mockSocketClient: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(30000);
        mockSettleGameRoundConsumer = {
            settleRoundById: jest.fn(),
        };
        mockLogService = {
            logError: jest.fn(),
        };
        mockSocketClient = {
            id: "socket-123",
        };

        consumer = new RouletteOutGameConsumer(mockGameData, mockSettleGameRoundConsumer, mockLogService);
    });

    describe("constructor", () => {
        it("should initialize with all required dependencies", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteOutGameConsumer);
            expect(consumer.gameData).toBe(mockGameData);
            expect(consumer.settleGameRoundConsumer).toBe(mockSettleGameRoundConsumer);
            expect(consumer.logService).toBe(mockLogService);
        });
    });

    describe("consume", () => {
        it("should return early when player is not found", async () => {
            // Arrange
            mockGameData.realPlayers = {};

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should return early when player data is not found", async () => {
            // Arrange
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: "Player1" } },
            };
            mockGameData.ingame = {};

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should settle round when all conditions are met", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).toHaveBeenCalledWith(100, playerName);
        });

        it("should not settle round when roundId is 0", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 0,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should not settle round when betTracks is empty", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: {},
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should not settle round when betQueue is not empty", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [{ someBet: true }],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should not settle round when betProcessing is true", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: true,
                    settleProcessing: false,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should not settle round when settleProcessing is true", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: true,
                },
            };

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
        });

        it("should call parent consume method after processing", async () => {
            // Arrange
            const playerName = "Player1";
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: playerName } },
            };
            mockGameData.ingame = {
                [playerName]: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };
            const parentConsumeSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "consume");

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(parentConsumeSpy).toHaveBeenCalledWith(mockSocketClient);
        });

        it("should call parent consume method even when conditions are not met", async () => {
            // Arrange
            mockGameData.realPlayers = {};
            const parentConsumeSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "consume");

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(parentConsumeSpy).toHaveBeenCalledWith(mockSocketClient);
        });

        it("should handle errors and log them", async () => {
            // Arrange
            const error = new Error("Test error");
            mockGameData.realPlayers = {
                "socket-123": { profile: { name: "Player1" } },
            };
            mockGameData.ingame = {
                Player1: {
                    roundId: 100,
                    betTracks: { someBet: true },
                    betQueue: [],
                    betProcessing: false,
                    settleProcessing: false,
                },
            };
            mockSettleGameRoundConsumer.settleRoundById.mockRejectedValue(error);

            // Act
            await consumer.consume(mockSocketClient);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });
});
