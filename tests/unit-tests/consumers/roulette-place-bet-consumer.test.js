import { helpers } from "sc-common";
import RoulettePlaceBetConsumer from "../../../src/consumers/roulette-place-bet-consumer";
import notices from "../../../src/constants/notices";
import { PlaceBetConsumer } from "sc-game-base/src/core/event-consumers";

describe("RoulettePlaceBetConsumer", () => {
    let consumer;
    let mockPlayer;
    let mockGameData;

    beforeEach(() => {
        // Setup mock player
        mockPlayer = {
            profile: {
                name: "testPlayer",
                minBet: 1,
                maxBet: 1000,
            },
            session: {
                currencyGroupId: "1",
                currencyName: "USD",
                system: "web",
                operatorId: "testOperator",
            },
        };

        // Setup mock game data
        mockGameData = {
            gameConfigs: {
                enabled: true,
                enableFreeBet: true,
                maxBetPerChoices: {
                    redBlack: 500,
                    oddEven: 500,
                    dozen: 1500,
                    straight: 1500,
                },
            },
            currencyGroupGames: [
                {
                    groupId: "1",
                    minBet: 1,
                    maxBet: 1000,
                },
            ],
            ingame: {},
        };

        // Initialize consumer
        consumer = new RoulettePlaceBetConsumer();
        consumer.gameData = mockGameData;
        consumer.definition = {
            choices: {
                choicesGroupByType: {
                    redBlack: ["red", "black"],
                    oddEven: ["odd", "even"],
                },
            },
            hedgeBetGroups: ["redBlack", "oddEven"],
        };
        consumer.getNoticeObj = jest.fn((notice, params) => ({ notice, params }));
    });

    describe("composeValidationCriteria", () => {
        it("should combine bet criteria with parent validation criteria", () => {
            // Arrange
            const betChoice = "red";
            const amount = 100;
            const freeBet = false;
            const roundId = "round1";
            PlaceBetConsumer.prototype.composeValidationCriteria = jest.fn().mockReturnValue([{ failure: false, notice: null }]);

            // Act
            const result = consumer.composeValidationCriteria(mockPlayer, betChoice, amount, freeBet, roundId);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty("failure");
            expect(result[0]).toHaveProperty("failure");
            expect(result[1]).toHaveProperty("failure");
            expect(result[1]).toHaveProperty("notice");
        });
    });

    describe("composeBetCriteria", () => {
        it("should return empty array when no bet queue exists", () => {
            // Act
            const result = consumer.composeBetCriteria(mockPlayer.profile.name);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].failure).toBe(false);
        });

        it("should return validation criteria when bet queue exists", () => {
            // Arrange
            mockGameData.ingame[mockPlayer.profile.name] = {
                betQueue: [{ amount: 100 }],
            };

            // Act
            const result = consumer.composeBetCriteria(mockPlayer.profile.name);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].failure).toBe(true);
            expect(result[0].notice).toEqual(consumer.getNoticeObj(helpers.noticeHelper.invalidBet));
        });
    });

    describe("composeBettingTimeValidationCriteria", () => {
        it("should return validation criteria when game is disabled", () => {
            // Arrange
            mockGameData.gameConfigs.enabled = false;

            // Act
            const result = consumer.composeBettingTimeValidationCriteria();

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].failure).toBe(true);
            expect(result[0].notice).toEqual(consumer.getNoticeObj(helpers.noticeHelper.invalidBet));
        });
    });

    describe("composeBetAmountValidationCriteria", () => {
        it("should validate bet amount within limits", () => {
            // Arrange
            const betChoices = {
                redBlack: { red: 0.5 },
            };
            const totalAmount = 100;
            const freeBet = false;

            // Act
            const result = consumer.composeBetAmountValidationCriteria(mockPlayer, betChoices, totalAmount, freeBet);

            // Assert
            expect(result).toHaveLength(5);
            expect(result[0].failure).toBe(false);
            expect(result[2].failure).toBe(true);
        });

        it("should fail when bet amount exceeds max bet", () => {
            // Arrange
            const betChoices = {
                redBlack: { red: 1500 },
            };
            const totalAmount = 1500;
            const freeBet = false;

            // Act
            const result = consumer.composeBetAmountValidationCriteria(mockPlayer, betChoices, totalAmount, freeBet);

            // Assert
            expect(result[1].failure).toBe(true);
            expect(result[4].failure).toBe(true);
        });
    });

    describe("composeBetChoiceValidationCriteria", () => {
        it("should validate correct bet choices", () => {
            // Arrange
            const betChoices = {
                redBlack: { red: 100 },
            };

            // Act
            const result = consumer.composeBetChoiceValidationCriteria(betChoices);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].failure).toBe(false);
        });

        it("should fail for invalid bet choices", () => {
            // Arrange
            const betChoices = {
                bigSmall: { big: 100 },
            };

            // Act
            const result = consumer.composeBetChoiceValidationCriteria(betChoices);

            // Assert
            expect(result[0].failure).toBe(true);
            expect(result[0].notice).toEqual(consumer.getNoticeObj(notices.invalidBetChoice));
        });
    });

    describe("consume", () => {
        it("should create new player in game data if not exists", () => {
            // Arrange
            const payload = {
                betChoices: { redBlack: { red: 100 } },
            };
            const expectedPayload = {
                ...payload,
                freeBet: false,
                amount: 100,
            };

            // Act
            consumer.consume(mockPlayer, payload);

            // Assert
            expect(mockGameData.ingame[mockPlayer.profile.name]).toBeDefined();
            expect(mockGameData.ingame[mockPlayer.profile.name].betQueue).toEqual([{ player: mockPlayer, payload: expectedPayload }]);
        });
    });

    describe("calculateTotalAmount", () => {
        it("should calculate total amount correctly", () => {
            // Arrange
            const betChoices = {
                straight: { 1: 100, 2: 200, 3: 300 },
                redBlack: { red: 100 },
                oddEven: { odd: 300 },
            };

            // Act
            const result = consumer.calculateTotalAmount(betChoices);

            // Assert
            expect(result).toBe(1000);
        });
    });

    describe("anyInvalidChoice", () => {
        const validBetChoices = {
            straight: [...Array(37).keys()].map((i) => i.toString()),
            dozen: ["1", "2", "3"],
            redBlack: ["red", "black"],
            oddEven: ["odd", "even"],
        };
        const testCases = [
            {
                betChoices: {
                    straight: { 0: 100, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 },
                    dozen: { 1: 100, 2: 200, 3: 300 },
                    redBlack: { red: 100, black: 200 },
                    oddEven: { odd: 100, even: 200 },
                },
                expectedResult: false,
            },
            {
                betChoices: {
                    straight: { 37: 100 },
                },
                expectedResult: true,
            },
            {
                betChoices: {
                    dozen: { 4: 100 },
                },
                expectedResult: true,
            },
            {
                betChoices: {
                    oddEven: { test: 100 },
                },
                expectedResult: true,
            },
            {
                betChoices: {
                    bigSmall: { big: 100 },
                },
                expectedResult: true,
            },
        ];
        it.each(testCases)("should return expected for betChoices", ({ betChoices, expectedResult }) => {
            // Act
            const result = consumer.anyInvalidChoice(betChoices, validBetChoices);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe("anyChoiceExceedItsMaxBet", () => {
        it("should return true when any choice exceeds its max bet", () => {
            // Arrange
            const betChoices = {
                redBlack: { red: 100 },
                dozen: { 1: 100 },
                oddEven: { odd: 100 },
                straight: { 1: 1500 },
            };

            // Act
            const result = consumer.anyChoiceExceedItsMaxBet(betChoices, mockGameData.gameConfigs, mockPlayer.profile.maxBet);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("anyChoiceBelowMinBet", () => {
        it("should return true when any choice is below min bet", () => {
            // Arrange
            const betChoices = {
                redBlack: { red: 0.5 },
                dozen: { 1: 100 },
                oddEven: { odd: 100 },
                straight: { 1: 100 },
            };

            // Act
            const result = consumer.anyChoiceBelowMinBet(betChoices, 1);

            // Assert
            expect(result).toBe(true);
        });
    });
});
