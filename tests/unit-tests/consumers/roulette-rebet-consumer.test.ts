import RouletteRebetConsumer from "../../../src/consumers/roulette-rebet-consumer";

// Mock the consumer dependencies
jest.mock("../../../src/consumers", () => ({
    PlaceBetConsumer: jest.fn(),
    HandleActionSettleConsumer: jest.fn(),
}));

describe("RouletteRebetConsumer", () => {
    let consumer: RouletteRebetConsumer;
    let mockPlaceBetConsumer: any;

    beforeEach(() => {
        mockPlaceBetConsumer = {
            consume: jest.fn(),
        };

        consumer = new RouletteRebetConsumer({
            placeBetConsumer: mockPlaceBetConsumer,
        });
    });

    describe("constructor", () => {
        it("should initialize with all required dependencies", () => {
            // Assert
            expect(consumer.placeBetConsumer).toBe(mockPlaceBetConsumer);
        });
    });

    describe("consume", () => {
        it("should return early when payload is null", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = null;

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).not.toHaveBeenCalled();
        });

        it("should return early when payload is undefined", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = undefined;

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).not.toHaveBeenCalled();
        });

        it("should return early when betChoices is missing", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = { otherProperty: "value" };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).not.toHaveBeenCalled();
        });

        it("should process single bet choice correctly", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: 100 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(1);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: 100 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should process multiple bet choices correctly", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: 100, black: 200 },
                    number: { "15": 50 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(3);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: 100 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { black: 200 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { number: { "15": 50 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle empty betChoices object", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {},
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).not.toHaveBeenCalled();
        });

        it("should handle betChoices with empty inner objects", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: {},
                    number: { "15": 50 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(1);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { number: { "15": 50 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle complex nested betChoices structure", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: 100, black: 200 },
                    number: { "15": 50, "20": 75 },
                    dozen: { first: 25, second: 30 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(6);
        });

        it("should handle zero bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: 0 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(1);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: 0 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle negative bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: -100 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(1);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: -100 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle decimal bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: 100.5 },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledTimes(1);
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: 100.5 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });
    });

    describe("splitBetChoices", () => {
        it("should split single bet choice correctly", () => {
            // Arrange
            const payload = {
                betChoices: {
                    color: { red: 100 },
                },
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                betChoices: { color: { red: 100 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should split multiple bet choices correctly", () => {
            // Arrange
            const payload = {
                betChoices: {
                    color: { red: 100, black: 200 },
                    number: { "15": 50 },
                },
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                betChoices: { color: { red: 100 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
            expect(result[1]).toEqual({
                betChoices: { color: { black: 200 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
            expect(result[2]).toEqual({
                betChoices: { number: { "15": 50 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle empty betChoices", () => {
            // Arrange
            const payload = {
                betChoices: {},
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(0);
        });

        it("should handle betChoices with empty inner objects", () => {
            // Arrange
            const payload = {
                betChoices: {
                    color: {},
                    number: { "15": 50 },
                },
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                betChoices: { number: { "15": 50 } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle complex nested structure", () => {
            // Arrange
            const payload = {
                betChoices: {
                    color: { red: 100, black: 200 },
                    number: { "15": 50, "20": 75 },
                },
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(4);
            expect(result.every((item: any) => item.freeBet === false)).toBe(true);
            expect(result.every((item: any) => item.receivedTime instanceof Date)).toBe(true);
        });

        it("should preserve bet amounts exactly", () => {
            // Arrange
            const payload = {
                betChoices: {
                    color: { red: 123.45 },
                    number: { "15": 678.9 },
                },
            };

            // Act
            const result = (consumer as any).splitBetChoices(payload);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].betChoices.color.red).toBe(123.45);
            expect(result[1].betChoices.number["15"]).toBe(678.9);
        });
    });

    describe("edge cases", () => {
        it("should handle player with null profile", () => {
            // Arrange
            const player = { profile: null };
            const payload = {
                betChoices: {
                    color: { red: 100 },
                },
            };

            // Act & Assert
            expect(() => consumer.consume(player, payload)).not.toThrow();
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, expect.any(Object));
        });

        it("should handle player with undefined profile", () => {
            // Arrange
            const player = { profile: undefined };
            const payload = {
                betChoices: {
                    color: { red: 100 },
                },
            };

            // Act & Assert
            expect(() => consumer.consume(player, payload)).not.toThrow();
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, expect.any(Object));
        });

        it("should handle very large bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: Number.MAX_SAFE_INTEGER },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: Number.MAX_SAFE_INTEGER } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle string bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: "100" as any },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: "100" } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle null bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: null as any },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: null } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });

        it("should handle undefined bet amounts", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const payload = {
                betChoices: {
                    color: { red: undefined as any },
                },
            };

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockPlaceBetConsumer.consume).toHaveBeenCalledWith(player, {
                betChoices: { color: { red: undefined } },
                freeBet: false,
                receivedTime: expect.any(Date),
            });
        });
    });
});
