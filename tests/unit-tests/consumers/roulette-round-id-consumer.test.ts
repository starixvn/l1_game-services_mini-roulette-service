import RouletteRoundIdConsumer from "../../../src/consumers/roulette-round-id-consumer";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Core: {
        BaseEventConsumers: {
            RoundIdConsumer: class {
                gameData: any;
                constructor(gameData: any) {
                    this.gameData = gameData;
                }
                async initRoundId() {
                    // Mock implementation
                }
            },
        },
    },
}));

describe("RouletteRoundIdConsumer", () => {
    let consumer: RouletteRoundIdConsumer;
    let mockGameData: any;

    beforeEach(() => {
        mockGameData = {
            roundId: 1000,
        };
        consumer = new RouletteRoundIdConsumer({} as any, {} as any, {} as any, {} as any);
        consumer.gameData = mockGameData;
    });

    describe("initRoundId", () => {
        it("should call parent initRoundId method", async () => {
            // Arrange
            const parentInitRoundIdSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "initRoundId");

            // Act
            await consumer.initRoundId();

            // Assert
            expect(parentInitRoundIdSpy).toHaveBeenCalled();
        });

        it("should increase roundId by 100 after calling parent method", async () => {
            // Arrange
            const initialRoundId = 1000;
            mockGameData.roundId = initialRoundId;
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "initRoundId");

            // Act
            await consumer.initRoundId();

            // Assert
            expect(mockGameData.roundId).toBe(initialRoundId + 100);
        });
    });
});
