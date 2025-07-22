import RouletteProcessBetQueue from "../../../src/crons/roulette-process-bet-queue";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteSettleGameRoundConsumer from "../../../src/consumers/roulette-settle-game-round-consumer";
import Constants from "../../../src/constants";
import { helpers } from "sc-common";
import notices from "../../../src/constants/notices";
import { Crons } from "sc-game-base/src/core";
import { buildBetAmountIncrement, trackBetChoices } from "../../../src/helpers/choice-helper";

// Mock dependencies
jest.mock("../../../src/consumers/roulette-settle-game-round-consumer", () => {
    return jest.fn().mockImplementation(() => ({
        settleRoundById: jest.fn(),
    }));
});

jest.mock("sc-common", () => ({
    helpers: {
        noticeHelper: {
            cannotPlaceBet: "CANNOT_PLACE_BET",
            invalidBet: "INVALID_BET",
            minBet: "MIN_BET",
            maxBet: "MAX_BET",
        },
    },
}));

jest.mock("../../../src/constants/notices", () => ({
    processingAction: "PROCESSING_ACTION",
    maxBetOfAnyChoiceReached: "MAX_BET_OF_ANY_CHOICE_REACHED",
    betAmountOfAnyChoiceIncorrect: "BET_AMOUNT_OF_ANY_CHOICE_INCORRECT",
}));

jest.mock("../../../src/helpers/choice-helper", () => ({
    trackBetChoices: jest.fn(),
    buildBetAmountIncrement: jest.fn(),
}));

describe("RouletteProcessBetQueue", () => {
    let processBetQueue: RouletteProcessBetQueue;
    let mockGameData: RouletteGameData;
    let mockSettleGameRoundConsumer: jest.Mocked<RouletteSettleGameRoundConsumer>;
    let mockGameManagementApiClientFactory: any;
    let mockPlayer: any;
    let mockPayload: any;
    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = new RouletteGameData(30000);
        mockSettleGameRoundConsumer = new RouletteSettleGameRoundConsumer({}) as any;
        mockGameManagementApiClientFactory = { instance: jest.fn() };

        processBetQueue = new RouletteProcessBetQueue({
            gameData: mockGameData,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
            gameManagementApiClientFactory: mockGameManagementApiClientFactory,
        });

        // Mock inherited properties and methods
        processBetQueue.betsRepository = {
            updateOne: jest.fn(),
        } as any;
        processBetQueue.betLogsRepository = {
            create: jest.fn(),
        } as any;
        processBetQueue.placeBetPublisher = {
            publishGameFailedBet: jest.fn(),
        } as any;
        processBetQueue.definition = {
            id: "test-game-id",
            choicesMapper: {
                straightUp: { "1": 1 },
                redBlack: { red: 38, black: 39 },
                dozen: { "1": 40, "2": 41, "3": 42 },
                oddEven: { even: 43, odd: 44 },
            },
        } as any;

        mockPlayer = {
            UID: "player123",
            profile: { name: "testPlayer" },
            session: {
                siteId: "site1",
                currencyName: "USD",
                operatorId: "op1",
                playerId: "player1",
                system: 1,
                currencyGroupId: "group1",
            },
        };

        mockPayload = {
            action: Constants.actions.bet,
            amount: 100,
            betChoices: { redBlack: { red: 100 } },
            freeBet: false,
            roundId: 1,
            clientSentTime: new Date(),
            receivedTime: new Date(),
        };

        // Setup game data
        mockGameData.ingame = {
            testPlayer: {
                betTracks: {},
                betQueue: [],
                roundId: 0,
                betProcessing: false,
                settleProcessing: false,
                betStartTime: new Date(),
            },
        };
        mockGameData.gameConfigs = {
            odds: { redBlack: 2, dozen: 3, straightUp: 36, oddEven: 2 },
        } as any;
        mockGameData.guaranteedFeature = {
            group1: {
                gamingDays: 3,
                totalDays: 7,
                guaranteedWin: { enabled: true, floating: 10, thresholdSettings: [] },
            },
        } as any;
    });

    describe("constructor", () => {
        it("should initialize with settleGameRoundConsumer", () => {
            // Assert
            expect(processBetQueue).toBeInstanceOf(RouletteProcessBetQueue);
            expect(processBetQueue.settleGameRoundConsumer).toBe(mockSettleGameRoundConsumer);
        });
    });

    describe("proceedBet", () => {
        it("should call proceedActionBet when action is bet", async () => {
            // Arrange
            const mockProceedActionBet = jest.fn();
            processBetQueue["proceedActionBet"] = mockProceedActionBet;

            // Act
            await processBetQueue.proceedBet(mockPlayer, mockPayload);

            // Assert
            expect(mockProceedActionBet).toHaveBeenCalledWith(mockPlayer, mockPayload);
        });

        it("should call proceedActionSettle when action is settle", async () => {
            // Arrange
            const mockProceedActionSettle = jest.fn();
            processBetQueue["proceedActionSettle"] = mockProceedActionSettle;
            mockPayload.action = Constants.actions.settle;

            // Act
            await processBetQueue.proceedBet(mockPlayer, mockPayload);

            // Assert
            expect(mockProceedActionSettle).toHaveBeenCalledWith(mockPlayer, mockPayload);
        });

        it("should do nothing for unknown action", async () => {
            // Arrange
            const mockProceedActionBet = jest.fn();
            const mockProceedActionSettle = jest.fn();
            processBetQueue["proceedActionBet"] = mockProceedActionBet;
            processBetQueue["proceedActionSettle"] = mockProceedActionSettle;
            mockPayload.action = "unknown";

            // Act
            await processBetQueue.proceedBet(mockPlayer, mockPayload);

            // Assert
            expect(mockProceedActionBet).not.toHaveBeenCalled();
            expect(mockProceedActionSettle).not.toHaveBeenCalled();
        });
    });

    describe("proceedActionBet", () => {
        let mockSuperProceedBet: jest.Mock;
        beforeEach(() => {
            mockSuperProceedBet = jest.fn();
            jest.spyOn(Crons.ProcessBetQueue.prototype, "proceedBet").mockImplementation((player, payload) =>
                mockSuperProceedBet(player, payload)
            );
            mockGameData.roundId = 10;
        });

        it("should set roundId and call parent proceedBet", async () => {
            // Arrange
            mockGameData.ingame.testPlayer.roundId = 0;

            // Act
            await processBetQueue["proceedActionBet"](mockPlayer, mockPayload);

            // Assert
            expect(mockGameData.ingame.testPlayer.roundId).toBe(10);
            expect(mockGameData.roundId).toBe(11);
            expect(mockPayload.roundId).toBe(10);
            expect(mockSuperProceedBet).toHaveBeenCalledWith(mockPlayer, mockPayload);
        });

        it("should use existing roundId when already set", async () => {
            // Arrange
            mockGameData.ingame.testPlayer.roundId = 5;

            // Act
            await processBetQueue["proceedActionBet"](mockPlayer, mockPayload);

            // Assert
            expect(mockGameData.ingame.testPlayer.roundId).toBe(5);
            expect(mockGameData.roundId).toBe(10);
            expect(mockPayload.roundId).toBe(5);
            expect(mockSuperProceedBet).toHaveBeenCalledWith(mockPlayer, mockPayload);
        });
    });

    describe("proceedActionSettle", () => {
        describe("when validation passes", () => {
            it("should call settleRoundById", async () => {
                // Arrange
                mockGameData.ingame.testPlayer = {
                    roundId: 123,
                    betTracks: { redBlack: { red: 100 } },
                    betQueue: [],
                    settleProcessing: false,
                };

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(mockSettleGameRoundConsumer.settleRoundById).toHaveBeenCalledWith(123, mockPlayer.profile.name);
            });
        });
        describe("when validation fails", () => {
            beforeEach(() => {
                mockGameData.ingame.testPlayer = {
                    roundId: 123,
                    betTracks: { redBlack: { red: 100 } },
                    betQueue: [],
                    settleProcessing: false,
                };
            });
            it("should publishGameFailedBet when not exist playerData", async () => {
                // Arrange
                delete mockGameData.ingame.testPlayer;

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(processBetQueue.placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(mockPlayer.UID, {
                    endBet: -1,
                    notice: { errorCode: helpers.noticeHelper.invalidBet, action: Constants.actions.settle },
                });
                expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
            });

            it("should publishGameFailedBet when betQueue is not empty", async () => {
                // Arrange
                mockGameData.ingame.testPlayer.betQueue = [
                    {
                        action: Constants.actions.bet,
                        amount: 100,
                        betChoices: { redBlack: { red: 100 } },
                        freeBet: false,
                        roundId: 1,
                    },
                ];

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(processBetQueue.placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(mockPlayer.UID, {
                    endBet: -1,
                    notice: { errorCode: notices.processingAction, action: Constants.actions.settle },
                });
                expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
            });

            it("should publishGameFailedBet when total is 0", async () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {};

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(processBetQueue.placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(mockPlayer.UID, {
                    endBet: -1,
                    notice: { errorCode: helpers.noticeHelper.invalidBet, action: Constants.actions.settle },
                });
                expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
            });

            it("should publishGameFailedBet when roundId is not set", async () => {
                // Arrange
                mockGameData.ingame.testPlayer.roundId = 0;

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(processBetQueue.placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(mockPlayer.UID, {
                    endBet: -1,
                    notice: { errorCode: helpers.noticeHelper.invalidBet, action: Constants.actions.settle },
                });
                expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
            });

            it("should publishGameFailedBet when settleProcessing is true", async () => {
                // Arrange
                mockGameData.ingame.testPlayer.settleProcessing = true;

                // Act
                await processBetQueue["proceedActionSettle"](mockPlayer, mockPayload);

                // Assert
                expect(processBetQueue.placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(mockPlayer.UID, {
                    endBet: -1,
                    notice: { errorCode: notices.processingAction, action: Constants.actions.settle },
                });
                expect(mockSettleGameRoundConsumer.settleRoundById).not.toHaveBeenCalled();
            });
        });
    });

    describe("composeValidationCriteria", () => {
        it("should return validation criteria for settle processing", async () => {
            // Arrange
            mockGameData.ingame.testPlayer.settleProcessing = true;

            // Act
            const result = await processBetQueue.composeValidationCriteria(mockPlayer, mockPayload);

            // Assert
            expect(result).toEqual([
                {
                    failure: true,
                    notice: { errorCode: helpers.noticeHelper.cannotPlaceBet },
                },
            ]);
        });
    });

    describe("upsertBet", () => {
        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        });
        it("should create new bet with all required fields", async () => {
            // Arrange
            const mockUpdateOne = jest.fn();
            processBetQueue.betsRepository.updateOne = mockUpdateOne;
            const roundId = 123;
            const bet = { redBlack: { red: 100 }, amount: 100 };
            const rate = 1.0;
            (buildBetAmountIncrement as jest.Mock).mockReturnValue({ "redBlack.red": 100 });

            // Act
            await processBetQueue.upsertBet(mockPlayer, roundId, bet, rate);

            // Assert
            expect(mockUpdateOne).toHaveBeenCalledWith(
                { uid: "player123", roundId: 123, freeBet: undefined },
                {
                    $inc: { "redBlack.red": 100, totalAmount: 100 },
                    $setOnInsert: {
                        uid: "player123",
                        name: "testPlayer",
                        time: new Date("2025-01-01T00:00:00.000Z"),
                        odds: { redBlack: 2, dozen: 3, straightUp: 36, oddEven: 2 },
                        freeBet: undefined,
                        roundId: 123,
                        siteId: "site1",
                        currency: "USD",
                        rate: 1.0,
                        operatorId: "op1",
                        playerId: "player1",
                        appType: 1,
                        currencyGroupId: "group1",
                        guaranteedFeature: mockGameData.guaranteedFeature.group1,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
        });

        it("should handle player without session", async () => {
            // Arrange
            const mockUpdateOne = jest.fn();
            processBetQueue.betsRepository.updateOne = mockUpdateOne;
            const playerWithoutSession = { ...mockPlayer, session: null };
            const roundId = 123;
            const bet = { redBlack: { red: 100 }, amount: 100 };
            const rate = 1.0;
            (buildBetAmountIncrement as jest.Mock).mockReturnValue({ "redBlack.red": 100 });

            // Act
            await processBetQueue.upsertBet(playerWithoutSession, roundId, bet, rate);

            // Assert
            expect(mockUpdateOne).toHaveBeenCalledWith(
                { uid: "player123", roundId: 123, freeBet: undefined },
                {
                    $inc: { "redBlack.red": 100, totalAmount: 100 },
                    $setOnInsert: {
                        uid: "player123",
                        name: "testPlayer",
                        time: new Date("2025-01-01T00:00:00.000Z"),
                        odds: { redBlack: 2, dozen: 3, straightUp: 36, oddEven: 2 },
                        freeBet: undefined,
                        roundId: 123,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
        });
    });

    describe("insertBetLog", () => {
        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        });
        it("should create bet log with all required fields", async () => {
            // Arrange
            const mockCreate = jest.fn();
            processBetQueue.betLogsRepository.create = mockCreate;
            const roundId = 123;
            const bet = { betChoices: { redBlack: { red: 100 } } };
            const rate = 1.0;

            // Act
            await processBetQueue.insertBetLog(mockPlayer, roundId, bet, rate);

            // Assert
            expect(mockCreate).toHaveBeenCalledWith({
                uid: "player123",
                name: "testPlayer",
                time: new Date("2025-01-01T00:00:00.000Z"),
                freeBet: undefined,
                redBlack: { red: 100 },
                roundId: 123,
                clientSentTime: undefined,
                receivedTime: undefined,
                siteId: "site1",
                currency: "USD",
                rate: 1.0,
                operatorId: "op1",
                playerId: "player1",
                appType: 1,
                currencyGroupId: "group1",
            });
        });
    });

    describe("formatApiBetInfo", () => {
        it("should format bet info correctly", () => {
            // Arrange
            const payload = {
                amount: 100,
                roundId: 123,
                freeBet: false,
                betChoices: { redBlack: { red: 100 } },
                clientSentTime: new Date("2025-01-01"),
            };

            // Act
            const result = processBetQueue.formatApiBetInfo(payload);

            // Assert
            expect(result).toEqual({
                amount: 100,
                gameId: "test-game-id",
                gameRoundId: 123,
                freeBet: false,
                choiceId: 38, // red choice ID
                clientSentTime: new Date("2025-01-01"),
            });
        });
    });

    describe("generatePlacingBetResult", () => {
        it("should generate placing bet result with own chip", () => {
            // Arrange
            const balance = { amount: 1000 };
            const payload = {
                amount: 100,
                betChoices: { redBlack: { red: 100 } },
                roundId: 123,
            };
            const rate = 1.0;
            const mockSuperResult = { endBet: 100 };

            // Mock parent method
            jest.spyOn(Crons.ProcessBetQueue.prototype, "generatePlacingBetResult").mockImplementation(
                (player, balance, payload, rate): any => mockSuperResult
            );

            // Act
            const result = processBetQueue.generatePlacingBetResult(mockPlayer, balance, payload, rate);

            // Assert
            expect(result).toEqual({
                ...mockSuperResult,
                ownChip: { betChoices: { redBlack: { red: 100 } }, amount: 100 },
                roundId: 123,
            });
        });
    });

    describe("decreaseBetTracks", () => {
        it("should decrease bet tracks and reset roundId when total is zero", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 100 } }, amount: 100 };
            mockGameData.ingame.testPlayer.betTracks = { redBlack: { red: 100 } };
            mockGameData.ingame.testPlayer.roundId = 123;
            (trackBetChoices as jest.Mock).mockImplementation((betTracks, betChoices, amount, reduce) => {
                betTracks.redBlack = {};
            });

            // Act
            processBetQueue.decreaseBetTracks("testPlayer", bet);

            // Assert
            expect(mockGameData.ingame.testPlayer.roundId).toBe(0);
        });

        it("should not reset roundId when total is not zero", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 50 } }, amount: 50 };
            mockGameData.ingame.testPlayer.betTracks = { redBlack: { red: 100 } };
            mockGameData.ingame.testPlayer.roundId = 123;
            (trackBetChoices as jest.Mock).mockImplementation((betTracks, betChoices, amount, reduce) => {
                betTracks.redBlack.red -= amount;
            });

            // Act
            processBetQueue.decreaseBetTracks("testPlayer", bet);

            // Assert
            expect(mockGameData.ingame.testPlayer.roundId).toBe(123);
        });
    });

    describe("getTotalAmountInBetTracks", () => {
        it("should calculate total amount from bet tracks", () => {
            // Arrange
            mockGameData.ingame.testPlayer.betTracks = {
                redBlack: { red: 100, black: 200 },
                dozen: { "1": 300 },
            };

            // Act
            const result = processBetQueue.getTotalAmountInBetTracks("testPlayer");

            // Assert
            expect(result).toBe(600);
        });

        it("should return 0 when no bet tracks exist", () => {
            // Arrange
            mockGameData.ingame.testPlayer.betTracks = { redBlack: {} };

            // Act
            const result = processBetQueue.getTotalAmountInBetTracks("testPlayer");

            // Assert
            expect(result).toBe(0);
        });

        it("should return 0 when player does not exist", () => {
            // Act
            const result = processBetQueue.getTotalAmountInBetTracks("nonexistentPlayer");

            // Assert
            expect(result).toBe(0);
        });
    });

    describe("adjustBetTracks", () => {
        it("should call trackBetChoices when exist player data", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 100 } }, amount: 100 };
            mockGameData.ingame.testPlayer.betTracks = { redBlack: { red: 50 } };

            // Act
            processBetQueue.adjustBetTracks("testPlayer", bet, false);

            // Assert
            expect(trackBetChoices).toHaveBeenCalledWith(mockGameData.ingame.testPlayer.betTracks, bet.betChoices, 1, false);
        });

        it("should not call trackBetChoices when not exist player data", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 100 } }, amount: 100 };
            mockGameData.ingame = {};

            // Act
            processBetQueue.adjustBetTracks("nonexistentPlayer", bet, false);

            // Assert
            expect(trackBetChoices).not.toHaveBeenCalled();
        });
    });

    describe("adjustOwnBets", () => {
        it("should call trackBetChoices when exist player data", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 100 } }, amount: 100 };
            mockGameData.ingame.testPlayer.ownBets = { redBlack: { red: 50 } };

            // Act
            processBetQueue.adjustOwnBets("testPlayer", bet);

            // Assert
            expect(trackBetChoices).toHaveBeenCalledWith(mockGameData.ingame.testPlayer.ownBets, bet.betChoices, 1);
        });

        it("should not call trackBetChoices when not exist player data", () => {
            // Arrange
            const bet = { betChoices: { redBlack: { red: 100 } }, amount: 100 };
            mockGameData.ingame = {};

            // Act
            processBetQueue.adjustOwnBets("nonexistentPlayer", bet);

            // Assert
            expect(trackBetChoices).not.toHaveBeenCalled();
        });
    });
});
