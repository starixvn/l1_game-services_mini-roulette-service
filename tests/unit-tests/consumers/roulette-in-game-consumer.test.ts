import RouletteInGameConsumer from "../../../src/consumers/roulette-in-game-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteGameDefinition from "../../../src/roulette-game-definition";
import { RouletteRoundQuery } from "../../../src/query-apis";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Core: {
        BaseEventConsumers: {
            InGameConsumer: class {
                constructor() {}
                async getUserInfo(realPlayer: any) {
                    return { userId: "user1", name: "Player1" };
                }
            },
        },
    },
    Table: {
        TableGameData: class {},
    },
}));

// Mock the round query
jest.mock("../../../src/query-apis", () => ({
    RouletteRoundQuery: class {
        async getListByPlayerId(playerId: string, numberOfRounds: number) {
            return [{ id: 1, result: 15 }];
        }
    },
}));

describe("RouletteInGameConsumer", () => {
    let consumer: RouletteInGameConsumer;
    let mockGameData: RouletteGameData;
    let mockDefinition: any;
    let mockRoundQuery: any;
    let mockRealPlayer: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(30000);
        mockDefinition = {
            name: "miniroulette",
            numberOfRoundHistory: 10,
        };
        mockRoundQuery = new RouletteRoundQuery({} as any, {} as any);
        mockRealPlayer = {
            UID: "user1",
            socketClient: {
                emit: jest.fn(),
            },
            session: {
                currencyCode: "USD",
                multiplier: 1,
                currencyGroupId: "1",
            },
        };
        mockGameData.exchangeRates = { code: {} } as any;
        mockGameData.currencyGroupGames = [];

        consumer = new RouletteInGameConsumer({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
        consumer.gameData = mockGameData;
        consumer.definition = mockDefinition;
        consumer.roundQuery = mockRoundQuery;
    });

    describe("constructor", () => {
        it("should extend the base InGameConsumer", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteInGameConsumer);
        });
    });

    describe("consume", () => {
        it("should emit disabled game message when game is disabled", async () => {
            // Arrange
            mockGameData.gameConfigs = { enabled: false } as any;
            mockGameData.umMessages = "Game is under maintenance" as any;

            // Act
            await consumer.consume(mockRealPlayer);

            // Assert
            expect(mockRealPlayer.socketClient.emit).toHaveBeenCalledWith("miniroulette", {
                remainingTime: mockGameData.remainingTime,
                um: true,
                um_message: "Game is under maintenance",
            });
        });

        it("should emit game payload when game is enabled", async () => {
            // Arrange
            mockGameData.gameConfigs = { enabled: true } as any;
            const expectedPayload = {
                gameConfigs: {
                    odds: { red: 2, black: 2 },
                    enableFreeBet: true,
                    boostedChoices: [],
                },
                roundHistory: [],
                user: { userId: "user1", name: "Player1", rate: 1.0 },
            };
            consumer.buildPayload = jest.fn().mockResolvedValue(expectedPayload);

            // Act
            await consumer.consume(mockRealPlayer);

            // Assert
            expect(mockRealPlayer.socketClient.emit).toHaveBeenCalledWith("miniroulette", expectedPayload);
        });
    });

    describe("buildPayload", () => {
        it("should build complete payload with all required data", async () => {
            // Arrange
            mockGameData.exchangeRates = {
                code: { USD: 1.0 },
            } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                } as any,
            ];
            mockGameData.gameConfigs = {
                odds: { red: 2, black: 2 },
                originalOdds: { red: 2, black: 2 },
                enableFreeBet: true,
                boostedChoices: [],
            } as any;

            // Act
            const payload = await consumer.buildPayload(mockRealPlayer);

            // Assert
            expect(payload).toHaveProperty("gameConfigs");
            expect(payload).toHaveProperty("roundHistory");
            expect(payload).toHaveProperty("user");
            expect(payload.user.rate).toBe(1.0);
            expect(payload.gameConfigs.groupId).toBe("1");
        });
    });

    describe("getGameConfigs", () => {
        it("should return merged game configs with currency group settings", () => {
            // Arrange
            mockGameData.gameConfigs = {
                odds: { red: 2, black: 2 },
                originalOdds: { red: 2, black: 2 },
                enableFreeBet: true,
                boostedChoices: [],
            } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                } as any,
            ];

            // Act
            const configs = consumer.getGameConfigs(mockRealPlayer);

            // Assert
            expect(configs).toEqual({
                groupId: "1",
                minBet: 10,
                maxBet: 1000,
                odds: { red: 2, black: 2 },
                originalOdds: { red: 2, black: 2 },
                enableFreeBet: true,
                boostedChoices: [],
            });
        });
    });
});
