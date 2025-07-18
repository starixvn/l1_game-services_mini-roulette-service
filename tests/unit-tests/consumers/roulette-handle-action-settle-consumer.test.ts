import RouletteHandleActionSettleConsumer from "../../../src/consumers/roulette-handle-action-settle-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteSettleGameRoundConsumer from "../../../src/consumers/roulette-settle-game-round-consumer";
import Constants from "../../../src/constants";

// Mock sc-common helpers
jest.mock("sc-common", () => ({
    helpers: {
        noticeHelper: {
            invalidBet: "invalidBet",
            cannotPlaceBet: "cannotPlaceBet",
        },
    },
}));

describe("RouletteHandleActionSettleConsumer", () => {
    let consumer: RouletteHandleActionSettleConsumer;
    let mockGameData: RouletteGameData;
    let mockSettleGameRoundConsumer: any;
    let mockPublisher: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(30000);
        mockSettleGameRoundConsumer = {
            settleRoundById: jest.fn(),
        };
        mockPublisher = {
            publishToUser: jest.fn(),
        };

        consumer = new RouletteHandleActionSettleConsumer({
            gameData: mockGameData,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
            publisher: mockPublisher,
        });
    });

    describe("constructor", () => {
        it("should initialize with all required dependencies", () => {
            // Assert
            expect(consumer.gameData).toBe(mockGameData);
            expect(consumer.settleGameRoundConsumer).toBe(mockSettleGameRoundConsumer);
            expect(consumer.publisher).toBe(mockPublisher);
        });
    });

    describe("consume", () => {
        describe("when data is invalid", () => {
            it("should notify error to player when player data is missing", () => {
                // Arrange
                const player = { profile: { name: "nonexistent" }, UID: "1" };
                mockGameData.ingame = {};

                // Act
                consumer.consume(player);

                // Assert
                expect(mockPublisher.publishToUser).toHaveBeenCalledWith("1", {
                    endBet: -1,
                    notice: {
                        errorCode: "invalidBet",
                        action: Constants.actions.settle,
                    },
                });
            });

            it("should notify error to player when settle processing is true", () => {
                // Arrange
                const player = { profile: { name: "player1" }, UID: "1" };
                mockGameData.ingame = {
                    player1: {
                        betQueue: [],
                        settleProcessing: true,
                    },
                };

                // Act
                consumer.consume(player);

                // Assert
                expect(mockPublisher.publishToUser).toHaveBeenCalledWith("1", {
                    endBet: -1,
                    notice: {
                        errorCode: "cannotPlaceBet",
                        action: Constants.actions.settle,
                    },
                });
            });

            it("should notify error to player when settle action is in queue", () => {
                // Arrange
                const player = { profile: { name: "player1" }, UID: "1" };
                mockGameData.ingame = {
                    player1: {
                        betQueue: [
                            {
                                payload: { action: Constants.actions.settle },
                            },
                        ],
                        settleProcessing: false,
                    },
                };

                // Act
                consumer.consume(player);

                // Assert
                expect(mockPublisher.publishToUser).toHaveBeenCalledWith("1", {
                    endBet: -1,
                    notice: {
                        errorCode: "cannotPlaceBet",
                        action: Constants.actions.settle,
                    },
                });
            });
        });

        it("should handle player with existing bet queue", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            mockGameData.ingame = {
                player1: {
                    betQueue: [{ existing: "bet" }],
                    settleProcessing: false,
                },
            };

            // Act
            consumer.consume(player);

            // Assert
            expect(mockGameData.ingame.player1.betQueue).toHaveLength(2);
            expect(mockGameData.ingame.player1.betQueue[1]).toEqual({
                player,
                payload: { action: Constants.actions.settle },
            });
        });
    });
});
