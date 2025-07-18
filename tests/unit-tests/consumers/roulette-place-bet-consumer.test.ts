import RoulettePlaceBetConsumer from "../../../src/consumers/roulette-place-bet-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteGameDefinition from "../../../src/roulette-game-definition";
import Constants from "../../../src/constants";

// Mock sc-common helpers
jest.mock("sc-common", () => ({
    helpers: {
        noticeHelper: {
            invalidBet: "invalidBet",
            cannotPlaceBet: "cannotPlaceBet",
            minBet: "minBet",
            maxBet: "maxBet",
        },
    },
}));

// Mock notices
jest.mock("../../../src/constants/notices", () => ({
    maxBetOfAnyChoiceReached: "maxBetOfAnyChoiceReached",
    betAmountOfAnyChoiceIncorrect: "betAmountOfAnyChoiceIncorrect",
    invalidBetChoice: "invalidBetChoice",
}));

describe("RoulettePlaceBetConsumer", () => {
    let consumer: RoulettePlaceBetConsumer;
    let mockGameData: RouletteGameData;
    let mockDefinition: any;
    let mockPublisher: any;

    beforeEach(() => {
        mockGameData = new RouletteGameData(30000);
        mockDefinition = {
            choices: {
                choicesGroupByType: {
                    color: ["red", "black"],
                    number: Array.from({ length: 37 }, (_, i) => i.toString()),
                },
            },
        };
        mockPublisher = {
            publishToUser: jest.fn(),
        };

        consumer = new RoulettePlaceBetConsumer(mockDefinition, mockGameData, mockPublisher);
    });

    describe("constructor", () => {
        it("should extend the base PlaceBetConsumer", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RoulettePlaceBetConsumer);
            expect(consumer.definition).toBe(mockDefinition);
        });
    });

    describe("composeValidationCriteria", () => {
        it("should combine round validation with base validation", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const betChoices = { color: { red: 100 } };
            const amount = 100;
            const freeBet = false;
            const roundId = 1;

            // Act
            const criteria = consumer.composeValidationCriteria(player, betChoices, amount, freeBet, roundId);

            // Assert
            expect(criteria).toBeInstanceOf(Array);
        });

        it("should include round validation criteria", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            const betChoices = { color: { red: 100 } };
            const amount = 100;
            const freeBet = false;
            const roundId = 1;

            // Act
            const criteria = consumer.composeValidationCriteria(player, betChoices, amount, freeBet, roundId);

            // Assert
            expect(criteria.length).toBeGreaterThan(0);
        });
    });

    describe("composeRoundValidationCriteria", () => {
        it("should return cannot place bet when settle processing is true", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            mockGameData.ingame = {
                player1: {
                    betQueue: [],
                    settleProcessing: true,
                },
            };

            // Act
            const criteria = consumer.composeRoundValidationCriteria(player);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(true);
            expect(criteria[0].notice.errorCode).toBe("cannotPlaceBet");
        });

        it("should return cannot place bet when settle action is in queue", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
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
            const criteria = consumer.composeRoundValidationCriteria(player);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(true);
            expect(criteria[0].notice.errorCode).toBe("cannotPlaceBet");
        });

        it("should return valid criteria when no issues exist", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            mockGameData.ingame = {
                player1: {
                    betQueue: [],
                    settleProcessing: false,
                },
            };

            // Act
            const criteria = consumer.composeRoundValidationCriteria(player);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(false);
        });

        it("should handle missing ingame data", () => {
            // Arrange
            const player = { profile: { name: "player1" } };
            mockGameData.ingame = {};

            // Act
            const criteria = consumer.composeRoundValidationCriteria(player);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(false);
        });
    });

    describe("composeBettingTimeValidationCriteria", () => {
        it("should return invalid bet when game is disabled", () => {
            // Arrange
            mockGameData.gameConfigs = { enabled: false } as any;

            // Act
            const criteria = consumer.composeBettingTimeValidationCriteria(1);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(true);
            expect(criteria[0].notice.errorCode).toBe("invalidBet");
        });

        it("should return valid criteria when game is enabled", () => {
            // Arrange
            mockGameData.gameConfigs = { enabled: true } as any;

            // Act
            const criteria = consumer.composeBettingTimeValidationCriteria(1);

            // Assert
            expect(criteria).toHaveLength(1);
            expect(criteria[0].failure).toBe(false);
        });
    });

    describe("composeBetAmountValidationCriteria", () => {
        it("should return invalid bet when free bet is not enabled", () => {
            // Arrange
            const player = {
                profile: { minBet: 10, maxBet: 1000 },
                session: { currencyGroupId: "1" },
            };
            const betChoices = { color: { red: 100 } };
            const totalAmount = 100;
            const freeBet = true;
            mockGameData.gameConfigs = { enableFreeBet: false } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                } as any,
            ];

            // Act
            const criteria = consumer.composeBetAmountValidationCriteria(player, betChoices, totalAmount, freeBet);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "invalidBet")).toBe(true);
        });

        it("should return max bet reached when choice exceeds limit", () => {
            // Arrange
            const player = {
                profile: { minBet: 10, maxBet: 1000 },
                session: { currencyGroupId: "1" },
            };
            const betChoices = { color: { red: 2000 } };
            const totalAmount = 2000;
            const freeBet = false;
            mockGameData.gameConfigs = { enableFreeBet: true } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                    maxBetPerChoices: { color: 500 },
                } as any,
            ];

            // Act
            const criteria = consumer.composeBetAmountValidationCriteria(player, betChoices, totalAmount, freeBet);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "maxBetOfAnyChoiceReached")).toBe(true);
        });

        it("should return min bet error when amount is below minimum", () => {
            // Arrange
            const player = {
                profile: { minBet: 10, maxBet: 1000 },
                session: { currencyGroupId: "1" },
            };
            const betChoices = { color: { red: 5 } };
            const totalAmount = 5;
            const freeBet = false;
            mockGameData.gameConfigs = { enableFreeBet: true } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                } as any,
            ];

            // Act
            const criteria = consumer.composeBetAmountValidationCriteria(player, betChoices, totalAmount, freeBet);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "minBet")).toBe(true);
        });

        it("should return max bet error when amount exceeds maximum", () => {
            // Arrange
            const player = {
                profile: { minBet: 10, maxBet: 1000 },
                session: { currencyGroupId: "1" },
            };
            const betChoices = { color: { red: 1500 } };
            const totalAmount = 1500;
            const freeBet = false;
            mockGameData.gameConfigs = { enableFreeBet: true } as any;
            mockGameData.currencyGroupGames = [
                {
                    groupId: "1",
                    minBet: 10,
                    maxBet: 1000,
                } as any,
            ];

            // Act
            const criteria = consumer.composeBetAmountValidationCriteria(player, betChoices, totalAmount, freeBet);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "maxBet")).toBe(true);
        });
    });

    describe("composeBetChoiceValidationCriteria", () => {
        it("should return invalid bet choice when no choices provided", () => {
            // Arrange
            const betChoices = {};

            // Act
            const criteria = consumer.composeBetChoiceValidationCriteria(betChoices);

            // Assert
            expect(criteria).toHaveLength(2);
            expect(criteria[0].failure).toBe(true);
            expect(criteria[0].notice.errorCode).toBe("invalidBetChoice");
        });

        it("should return invalid bet choice when choice is not valid", () => {
            // Arrange
            const betChoices = { color: { invalid: 100 } };

            // Act
            const criteria = consumer.composeBetChoiceValidationCriteria(betChoices);

            // Assert
            expect(criteria).toHaveLength(2);
            expect(criteria[1].failure).toBe(true);
            expect(criteria[1].notice.errorCode).toBe("invalidBetChoice");
        });

        it("should return valid criteria when choices are valid", () => {
            // Arrange
            const betChoices = { color: { red: 100 } };

            // Act
            const criteria = consumer.composeBetChoiceValidationCriteria(betChoices);

            // Assert
            expect(criteria).toHaveLength(2);
            expect(criteria[0].failure).toBe(false);
            expect(criteria[1].failure).toBe(false);
        });
    });

    describe("composeHedgeBetValidationCriteria", () => {
        it("should return empty array for hedge bet validation", () => {
            // Arrange
            const betChoices = { color: { red: 100 } };
            const player = { profile: { name: "player1" } };

            // Act
            const criteria = consumer.composeHedgeBetValidationCriteria(betChoices, player);

            // Assert
            expect(criteria).toEqual([]);
        });
    });

    describe("validateClientSeed", () => {
        it("should return empty array for client seed validation", () => {
            // Arrange
            const request = { clientSeed: "test" };

            // Act
            const criteria = consumer.validateClientSeed(request);

            // Assert
            expect(criteria).toEqual([]);
        });
    });

    describe("validateBetRequestParams", () => {
        it("should return invalid bet when amount is missing", () => {
            // Arrange
            const request = { betChoices: { color: { red: 100 } } };

            // Act
            const criteria = consumer.validateBetRequestParams(request);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "invalidBet")).toBe(true);
        });

        it("should return invalid bet when betChoices is missing", () => {
            // Arrange
            const request = { amount: 100 };

            // Act
            const criteria = consumer.validateBetRequestParams(request);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "invalidBet")).toBe(true);
        });

        it("should return invalid bet choice when more than one choice is selected", () => {
            // Arrange
            const request = {
                amount: 100,
                betChoices: {
                    color: { red: 50 },
                    number: { "15": 50 },
                },
            };

            // Act
            const criteria = consumer.validateBetRequestParams(request);

            // Assert
            expect(criteria.some((c) => c.failure && c.notice.errorCode === "invalidBetChoice")).toBe(true);
        });

        it("should return valid criteria when request is valid", () => {
            // Arrange
            const request = {
                amount: 100,
                betChoices: { color: { red: 100 } },
            };

            // Act
            const criteria = consumer.validateBetRequestParams(request);

            // Assert
            expect(criteria.every((c) => !c.failure)).toBe(true);
        });
    });

    describe("consume", () => {
        it("should process valid bet request", () => {
            // Arrange
            const player = { profile: { name: "player1" }, session: { currencyName: "USD", system: 9 } };
            const payload = {
                betChoices: { redBlack: { red: 100, black: 50 } },
                freeBet: false,
                receivedTime: new Date(),
            } as any;
            mockGameData.ingame = {
                player1: {
                    betTracks: { redBlack: { black: 50 } },
                    betQueue: [],
                    settleProcessing: false,
                },
            };
            consumer.validateRequestParams = jest.fn().mockReturnValue(true);
            consumer.validateBetRequest = jest.fn().mockReturnValue(true);

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockGameData.ingame.player1.betQueue).toHaveLength(1);
            expect(payload.action).toBe(Constants.actions.bet);
            expect(payload.amount).toBe(150);
            expect(mockGameData.ingame.player1.betTracks).toEqual({ redBlack: { red: 100, black: 100 } });
        });

        it("should create new player data when player not in game", () => {
            // Arrange
            const player = { profile: { name: "newplayer" }, session: { currencyName: "USD", system: 9 } };
            const payload = {
                betChoices: { redBlack: { red: 100 } },
                freeBet: false,
                receivedTime: new Date(),
            };
            consumer.validateRequestParams = jest.fn().mockReturnValue(true);
            consumer.validateBetRequest = jest.fn().mockReturnValue(true);

            // Act
            consumer.consume(player, payload);

            // Assert
            expect(mockGameData.ingame.newplayer).toBeDefined();
            expect(mockGameData.ingame.newplayer.name).toBe("newplayer");
            expect(mockGameData.ingame.newplayer.betTracks).toEqual({ redBlack: { red: 100 } });
        });
    });

    describe("adjustBetTracks", () => {
        it("should update bet tracks with new bet amounts", () => {
            // Arrange
            const playerName = "player1";
            const bet = {
                betChoices: {
                    color: { red: 100, black: 200 },
                    number: { "15": 50 },
                },
            };
            mockGameData.ingame = {
                player1: {
                    betTracks: {
                        color: { red: 50 },
                    },
                },
            };

            // Act
            consumer.adjustBetTracks(playerName, bet);

            // Assert
            expect(mockGameData.ingame.player1.betTracks.color.red).toBe(150);
            expect(mockGameData.ingame.player1.betTracks.color.black).toBe(200);
            expect(mockGameData.ingame.player1.betTracks.number["15"]).toBe(50);
        });

        it("should create new bet type tracks when they don't exist", () => {
            // Arrange
            const playerName = "player1";
            const bet = {
                betChoices: {
                    color: { red: 100 },
                },
            };
            mockGameData.ingame = {
                player1: {
                    betTracks: {},
                },
            };

            // Act
            consumer.adjustBetTracks(playerName, bet);

            // Assert
            expect(mockGameData.ingame.player1.betTracks.color.red).toBe(100);
        });

        it("should handle missing ingame data", () => {
            // Arrange
            const playerName = "nonexistent";
            const bet = {
                betChoices: {
                    color: { red: 100 },
                },
            };

            // Act & Assert
            expect(() => consumer.adjustBetTracks(playerName, bet)).not.toThrow();
        });
    });

    describe("calculateTotalAmount", () => {
        it("should calculate total amount from bet choices", () => {
            // Arrange
            const betChoices = {
                color: { red: 100, black: 200 },
                number: { "15": 50 },
            };

            // Act
            const total = consumer.calculateTotalAmount(betChoices);

            // Assert
            expect(total).toBe(350);
        });

        it("should handle empty bet choices", () => {
            // Arrange
            const betChoices = {};

            // Act
            const total = consumer.calculateTotalAmount(betChoices);

            // Assert
            expect(total).toBe(0);
        });

        it("should handle nested empty choices", () => {
            // Arrange
            const betChoices = {
                color: {},
                number: { "15": 50 },
            };

            // Act
            const total = consumer.calculateTotalAmount(betChoices);

            // Assert
            expect(total).toBe(50);
        });
    });

    describe("anyInvalidChoice", () => {
        it("should return true when choice is not in valid choices", () => {
            // Arrange
            const betChoices = {
                color: { invalid: 100 },
            };
            const validBetChoices = {
                color: ["red", "black"],
            };

            // Act
            const result = consumer.anyInvalidChoice(betChoices, validBetChoices);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true when bet type is not valid", () => {
            // Arrange
            const betChoices = {
                invalidType: { red: 100 },
            };
            const validBetChoices = {
                color: ["red", "black"],
            };

            // Act
            const result = consumer.anyInvalidChoice(betChoices, validBetChoices);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when all choices are valid", () => {
            // Arrange
            const betChoices = {
                color: { red: 100 },
            };
            const validBetChoices = {
                color: ["red", "black"],
            };

            // Act
            const result = consumer.anyInvalidChoice(betChoices, validBetChoices);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("anyChoiceExceedItsMaxBet", () => {
        it("should return true when choice exceeds max bet", () => {
            // Arrange
            const betChoices = {
                color: { red: 1000 },
            };
            const betTracks = {};
            const configs = {
                maxBetPerChoices: { color: 500 },
            };
            const userMaxBet = 1000;

            // Act
            const result = consumer.anyChoiceExceedItsMaxBet(betChoices, betTracks, configs, userMaxBet);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true when combined amount exceeds max bet", () => {
            // Arrange
            const betChoices = {
                color: { red: 300 },
            };
            const betTracks = {
                color: { red: 300 },
            };
            const configs = {
                maxBetPerChoices: { color: 500 },
            };
            const userMaxBet = 1000;

            // Act
            const result = consumer.anyChoiceExceedItsMaxBet(betChoices, betTracks, configs, userMaxBet);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when all choices are within limits", () => {
            // Arrange
            const betChoices = {
                color: { red: 100 },
            };
            const betTracks = {};
            const configs = {
                maxBetPerChoices: { color: 500 },
            };
            const userMaxBet = 1000;

            // Act
            const result = consumer.anyChoiceExceedItsMaxBet(betChoices, betTracks, configs, userMaxBet);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("anyChoiceBelowMinBet", () => {
        it("should return true when choice is below min bet", () => {
            // Arrange
            const betChoices = {
                color: { red: 5 },
            };
            const betTracks = {};
            const minBet = 10;

            // Act
            const result = consumer.anyChoiceBelowMinBet(betChoices, betTracks, minBet);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true when combined amount is below min bet", () => {
            // Arrange
            const betChoices = {
                color: { red: 5 },
            };
            const betTracks = {
                color: { red: 3 },
            };
            const minBet = 10;

            // Act
            const result = consumer.anyChoiceBelowMinBet(betChoices, betTracks, minBet);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when all choices meet minimum", () => {
            // Arrange
            const betChoices = {
                color: { red: 15 },
            };
            const betTracks = {};
            const minBet = 10;

            // Act
            const result = consumer.anyChoiceBelowMinBet(betChoices, betTracks, minBet);

            // Assert
            expect(result).toBe(false);
        });
    });
});
