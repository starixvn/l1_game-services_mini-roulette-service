import RouletteInGameConsumer from "../../../src/consumers/roulette-in-game-consumer";

describe("RouletteInGameConsumer", () => {
    let consumer;
    let mockRealPlayer;
    let mockGameData;
    let mockRoundQuery;

    beforeEach(() => {
        // Setup mock socket client
        const mockSocketClient = {
            emit: jest.fn(),
        };

        // Setup mock real player
        mockRealPlayer = {
            socketClient: mockSocketClient,
            UID: "test-uid",
            session: {
                currencyCode: "USD",
                multiplier: 1,
                currencyGroupId: "1",
            },
        };

        // Setup mock game data
        mockGameData = {
            remainingTime: 30,
            gameConfigs: {
                enabled: true,
                odds: { red: 2, black: 2 },
                originalOdds: { red: 2, black: 2 },
                enableFreeBet: true,
                boostedChoices: [],
            },
            umMessages: [],
            exchangeRates: {
                code: {
                    USD: 1,
                },
            },
            currencyGroupGames: [
                {
                    groupId: "1",
                    minBet: 1,
                    maxBet: 100,
                },
            ],
        };

        // Setup mock queries
        mockRoundQuery = {
            getListByPlayerId: jest.fn().mockResolvedValue([]),
        };

        // Initialize consumer
        consumer = new RouletteInGameConsumer();
        consumer.definition = {
            name: "MiniRoulette",
            numberOfRoundHistory: 10,
        };
        consumer.gameData = mockGameData;
        consumer.roundQuery = mockRoundQuery;
        consumer.getUserInfo = jest.fn().mockResolvedValue({ balance: 1000 });
        consumer.getBalance = jest.fn();
    });

    describe("consume", () => {
        it("should emit disabled state when game configs are not enabled", async () => {
            // Arrange
            consumer.gameData.gameConfigs.enabled = false;

            // Act
            await consumer.consume(mockRealPlayer);

            // Assert
            expect(mockRealPlayer.socketClient.emit).toHaveBeenCalledWith("MiniRoulette", {
                remainingTime: 30,
                um: true,
                um_message: [],
            });
        });

        it("should emit game data when game is enabled", async () => {
            // Arrange
            const expectedPayload = {
                gameConfigs: {
                    groupId: "1",
                    minBet: 1,
                    maxBet: 100,
                    odds: { red: 2, black: 2 },
                    originalOdds: { red: 2, black: 2 },
                    enableFreeBet: true,
                    boostedChoices: [],
                },
                roundHistory: [],
                user: {
                    balance: 1000,
                    rate: 1,
                },
            };

            // Act
            await consumer.consume(mockRealPlayer);

            // Assert
            expect(mockRealPlayer.socketClient.emit).toHaveBeenCalledWith("MiniRoulette", expectedPayload);
        });
    });

    describe("buildPayload", () => {
        it("should build correct payload with user data and game configs", async () => {
            // Arrange
            mockRealPlayer.session.currencyCode = "EUR";
            mockRealPlayer.session.multiplier = 2;
            mockGameData.exchangeRates.code.EUR = 0.85;
            const expectedPayload = {
                gameConfigs: {
                    groupId: "1",
                    minBet: 1,
                    maxBet: 100,
                    odds: { red: 2, black: 2 },
                    originalOdds: { red: 2, black: 2 },
                    enableFreeBet: true,
                    boostedChoices: [],
                },
                roundHistory: [],
                user: {
                    balance: 1000,
                    rate: 1.7,
                },
            };

            // Act
            const result = await consumer.buildPayload(mockRealPlayer);

            // Assert
            expect(result).toEqual(expectedPayload);
            expect(consumer.getBalance).toHaveBeenCalledWith(mockRealPlayer, true);
            expect(mockRoundQuery.getListByPlayerId).toHaveBeenCalledWith("test-uid", 10);
            expect(consumer.getUserInfo).toHaveBeenCalledWith("test-uid");
        });
    });
});
