import RouletteSettleGameRoundConsumer from "../../../src/consumers/roulette-settle-game-round-consumer";
import { RouletteGameData } from "../../../src/roulette-game-data";
import RouletteRoundResultConsumer from "../../../src/consumers/roulette-round-result-consumer";
import RouletteGuaranteedFeatureConsumer from "../../../src/consumers/roulette-guaranteed-feature-consumer";
import { RouletteBet, RouletteRound, SettlementResult, GuaranteedStatus } from "../../../src/types";
import Constants from "../../../src/constants";

// Mock dependencies
jest.mock("../../../src/consumers/roulette-round-result-consumer", () => {
    return jest.fn().mockImplementation(() => ({
        generateResult: jest.fn(),
    }));
});

jest.mock("../../../src/consumers/roulette-guaranteed-feature-consumer", () => {
    return jest.fn().mockImplementation(() => ({
        calculateGuaranteedFeatureStatus: jest.fn(),
    }));
});

jest.mock("sc-common", () => ({
    logger: {
        logError: jest.fn(),
    },
}));

describe("RouletteSettleGameRoundConsumer", () => {
    let consumer: RouletteSettleGameRoundConsumer;
    let mockGameData: RouletteGameData;
    let mockRoundResultConsumer: any;
    let mockGuaranteedFeatureConsumer: jest.Mocked<RouletteGuaranteedFeatureConsumer>;
    let mockBetsRepository: any;
    let mockRoundsRepository: any;
    let mockLogService: any;
    let mockUserBetResultPublisher: any;
    let gameManagementApiClientFactory: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = new RouletteGameData(30000);
        mockRoundResultConsumer = {
            generateResult: jest.fn(),
        };
        mockGuaranteedFeatureConsumer = new RouletteGuaranteedFeatureConsumer({ gameData: mockGameData }) as any;
        mockBetsRepository = {
            find: jest.fn().mockReturnValue({ exec: jest.fn() }),
            findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
            create: jest.fn(),
        };
        mockRoundsRepository = {
            findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: jest.fn() }) }),
            create: jest.fn(),
        };
        mockLogService = {
            logError: jest.fn(),
        };
        mockUserBetResultPublisher = {
            publishToUser: jest.fn(),
            publish: jest.fn(),
        };
        gameManagementApiClientFactory = {
            instance: jest.fn(),
        };

        consumer = new RouletteSettleGameRoundConsumer({
            gameData: mockGameData,
            roundResultConsumer: mockRoundResultConsumer,
            guaranteedFeatureConsumer: mockGuaranteedFeatureConsumer,
            logService: mockLogService,
            gameManagementApiClientFactory,
        });

        // Mock inherited properties and methods
        consumer.betsRepository = mockBetsRepository;
        consumer.roundsRepository = mockRoundsRepository;
        consumer.userBetResultPublisher = mockUserBetResultPublisher;
        consumer.definition = {
            settle: jest.fn(),
            choicesMapper: {
                straightUp: { "1": 1 },
                redBlack: { red: 38, black: 39 },
                dozen: { "1": 40, "2": 41, "3": 42 },
                oddEven: { even: 43, odd: 44 },
            },
        } as any;

        // Setup game data
        mockGameData.gameConfigs = {
            odds: { redBlack: 2, dozen: 3, straightUp: 36, oddEven: 2 },
        } as any;
        mockGameData.exchangeRates = { exId: 1 } as any;
        mockGameData.ingame = {};
        mockGameData.playerBetHistory = {};
        mockGameData.accumulatedDays = 7;
    });

    describe("constructor", () => {
        it("should initialize with dependencies", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteSettleGameRoundConsumer);
            expect(consumer.roundResultConsumer).toBe(mockRoundResultConsumer);
            expect(consumer.guaranteedFeatureConsumer).toBe(mockGuaranteedFeatureConsumer);
            expect(consumer.logService).toBe(mockLogService);
        });
    });

    describe("settleUnsettledBets", () => {
        it("should settle all unpaid bets", async () => {
            // Arrange
            const mockBets = [
                { roundId: 1, uid: "player1", paid: false },
                { roundId: 2, uid: "player2", paid: false },
            ];
            const mockExec = jest.fn().mockResolvedValue(mockBets);
            mockBetsRepository.find.mockReturnValue({ exec: mockExec });

            const mockSettleBet = jest.fn();
            consumer.settleBet = mockSettleBet;

            // Act
            await consumer.settleUnsettledBets();

            // Assert
            expect(mockBetsRepository.find).toHaveBeenCalledWith({ paid: false });
            expect(mockExec).toHaveBeenCalled();
            expect(mockSettleBet).toHaveBeenCalledTimes(2);
            expect(mockSettleBet).toHaveBeenCalledWith(mockBets[0]);
            expect(mockSettleBet).toHaveBeenCalledWith(mockBets[1]);
        });

        it("should do nothing when no unpaid bets exist", async () => {
            // Arrange
            const mockExec = jest.fn().mockResolvedValue([]);
            mockBetsRepository.find.mockReturnValue({ exec: mockExec });

            const mockSettleBet = jest.fn();
            consumer.settleBet = mockSettleBet;

            // Act
            await consumer.settleUnsettledBets();

            // Assert
            expect(mockBetsRepository.find).toHaveBeenCalledWith({ paid: false });
            expect(mockSettleBet).not.toHaveBeenCalled();
        });
    });

    describe("settleRoundById", () => {
        it("should settle round and remove player from ingame", async () => {
            // Arrange
            const roundId = 123;
            const playerName = "testPlayer";
            const mockBet = { roundId, uid: "player1", paid: false };
            const mockExec = jest.fn().mockResolvedValue(mockBet);
            mockBetsRepository.findOne.mockReturnValue({ exec: mockExec });

            mockGameData.ingame[playerName] = { settleProcessing: false };

            const mockSettleBet = jest.fn();
            consumer.settleBet = mockSettleBet;

            // Act
            await consumer.settleRoundById(roundId, playerName);

            // Assert
            expect(mockBetsRepository.findOne).toHaveBeenCalledWith({ roundId });
            expect(mockSettleBet).toHaveBeenCalledWith(mockBet);
            expect(mockGameData.ingame[playerName]).toBeUndefined();
        });

        it("should not settle if bet is already paid", async () => {
            // Arrange
            const roundId = 123;
            const playerName = "testPlayer";
            const mockBet = { roundId, uid: "player1", paid: true };
            const mockExec = jest.fn().mockResolvedValue(mockBet);
            mockBetsRepository.findOne.mockReturnValue({ exec: mockExec });

            const mockSettleBet = jest.fn();
            consumer.settleBet = mockSettleBet;

            // Act
            await consumer.settleRoundById(roundId, playerName);

            // Assert
            expect(mockSettleBet).not.toHaveBeenCalled();
        });

        it("should log error when no bet found", async () => {
            // Arrange
            const roundId = 123;
            const playerName = "testPlayer";
            const mockExec = jest.fn().mockResolvedValue(null);
            mockBetsRepository.findOne.mockReturnValue({ exec: mockExec });

            // Act
            await consumer.settleRoundById(roundId, playerName);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(`No bet found for roundId: ${roundId}`);
        });
    });

    describe("settleBet", () => {
        let mockBet: any;
        let mockRound: any;
        let mockGuaranteedFeature: any;

        beforeEach(() => {
            mockBet = {
                roundId: 123,
                uid: "player1",
                name: "TestPlayer",
                totalAmount: 100,
                redBlack: { red: 100 },
                odds: { redBlack: 2 },
                paid: false,
                save: jest.fn(),
                time: new Date(),
            };
            mockRound = {
                id: 123,
                time: new Date(),
                result: 1,
                settlementResult: { redBlack: ["red"] },
            };
            mockGuaranteedFeature = {
                guaranteedWinStatus: "",
                guaranteedLossStatus: "",
                accumulatedAmount: -50,
            };

            mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue(mockGuaranteedFeature);

            const mockFindOrCreateRound = jest.fn().mockResolvedValue(mockRound);
            consumer.findOrCreateRound = mockFindOrCreateRound;

            const mockCalculateBetResult = jest.fn().mockReturnValue({
                totalBetAmount: 100,
                totalWin: 200,
                netWin: 100,
                totalLost: 0,
                winningByChoices: { redBlack: { red: 200 } },
            });
            consumer.calculateBetResult = mockCalculateBetResult;

            const mockCreateMetadata = jest.fn().mockReturnValue({
                BetDetails: [{ ChoiceId: 38, ValidBetAmount: 100, TotalAmount: 100, TotalWin: 200 }],
            });
            consumer.createMetadata = mockCreateMetadata;

            const mockCallEndGame = jest.fn();
            consumer.callEndGame = mockCallEndGame;
        });

        it("should settle bet successfully", async () => {
            // Arrange
            const mockCaptureBetHistory = jest.fn();
            consumer.captureBetHistory = mockCaptureBetHistory;

            // Act
            await consumer.settleBet(mockBet);

            // Assert
            expect(mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus).toHaveBeenCalledWith(mockBet);
            expect(consumer.findOrCreateRound).toHaveBeenCalledWith(mockBet, mockGuaranteedFeature);
            expect(mockBet.betwin).toBe(200);
            expect(mockBet.paid).toBe(true);
            expect(mockBet.guaranteedWinStatus).toBe("");
            expect(mockBet.guaranteedLossStatus).toBe("");
            expect(mockBet.accumulatedAmount).toBe(50);
            expect(mockBet.settlementDetails).toEqual([{ choiceId: 38, totalAmount: 100, validBetAmount: 100, totalWin: 200 }]);
            expect(mockBet.save).toHaveBeenCalled();
            expect(consumer.callEndGame).toHaveBeenCalled();
            expect(mockCaptureBetHistory).toHaveBeenCalledWith(
                mockBet.uid,
                mockRound.id,
                { netWin: 100, totalBetAmount: 100, totalWin: 200, totalLost: 0, winningByChoices: { redBlack: { red: 200 } } },
                mockBet.time,
                mockGuaranteedFeature
            );
            expect(mockUserBetResultPublisher.publishToUser).toHaveBeenCalledWith(mockBet.uid, {
                finish: { result: 1, settlementResult: { redBlack: ["red"] }, roundId: 123 },
            });
            expect(mockUserBetResultPublisher.publish).toHaveBeenCalledWith(mockBet.uid, {
                totalBetAmount: 100,
                totalWin: 200,
                netWin: 100,
                totalLost: 0,
                winningByChoices: { redBlack: { red: 200 } },
            });
        });

        it("should handle null guaranteed feature", async () => {
            // Arrange
            mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue(null);
            const mockCaptureBetHistory = jest.fn();
            consumer.captureBetHistory = mockCaptureBetHistory;

            // Act
            await consumer.settleBet(mockBet);

            // Assert
            expect(mockBet.guaranteedWinStatus).toBeUndefined();
            expect(mockBet.guaranteedLossStatus).toBeUndefined();
            expect(mockBet.accumulatedAmount).toBeUndefined();
            expect(mockCaptureBetHistory).toHaveBeenCalledWith(
                mockBet.uid,
                mockRound.id,
                { netWin: 100, totalBetAmount: 100, totalWin: 200, totalLost: 0, winningByChoices: { redBlack: { red: 200 } } },
                mockBet.time,
                null
            );
        });

        it("should log error when round creation fails", async () => {
            // Arrange
            consumer.findOrCreateRound = jest.fn().mockResolvedValue(null);

            // Act
            await consumer.settleBet(mockBet);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(`Cannot create round for roundId: ${mockBet.roundId}`);
            expect(mockBet.save).not.toHaveBeenCalled();
        });
    });

    describe("findOrCreateRound", () => {
        it("should return existing round when found", async () => {
            // Arrange
            const mockBet = { roundId: 123, uid: "player1", name: "test", time: new Date(), freeBet: false } as RouletteBet;
            const mockStatus = { guaranteedWinStatus: "" } as any;
            const existingRound = { id: 123, result: 1 };
            const mockExec = jest.fn().mockResolvedValue(existingRound);
            mockRoundsRepository.findOne.mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: mockExec }) });

            // Act
            const result = await consumer.findOrCreateRound(mockBet, mockStatus);

            // Assert
            expect(mockRoundsRepository.findOne).toHaveBeenCalledWith({ id: 123 });
            expect(result).toBe(existingRound);
        });

        it("should create new round when not found", async () => {
            // Arrange
            const mockBet = { roundId: 123, uid: "player1", name: "test", time: new Date(), freeBet: false } as RouletteBet;
            const mockStatus = { guaranteedWinStatus: "" } as any;
            const mockExec = jest.fn().mockResolvedValue(null);
            mockRoundsRepository.findOne.mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: mockExec }) });

            const mockResult = 1;
            const mockSettlementResult = { redBlack: ["red"] };
            mockRoundResultConsumer.generateResult.mockResolvedValue(mockResult);
            consumer.definition.settle = jest.fn().mockReturnValue(mockSettlementResult);

            const mockCreatedRound = { toObject: jest.fn().mockReturnValue({ id: 123, result: 1 }) };
            mockRoundsRepository.create.mockResolvedValue(mockCreatedRound);

            // Act
            const result = await consumer.findOrCreateRound(mockBet, mockStatus);

            // Assert
            expect(mockRoundResultConsumer.generateResult).toHaveBeenCalledWith(mockBet, mockStatus);
            expect(consumer.definition.settle).toHaveBeenCalledWith(mockResult);
            expect(mockRoundsRepository.create).toHaveBeenCalledWith({
                id: 123,
                result: 1,
                uid: "player1",
                settlementResult: { redBlack: ["red"] },
                time: expect.any(Date),
                exchangeRateId: 1,
            });
            expect(result).toEqual({ id: 123, result: 1 });
        });

        it("should return null when bet is null", async () => {
            // Act
            const result = await consumer.findOrCreateRound(null as any, {} as any);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("createMetadata", () => {
        it("should create metadata with bet details", () => {
            // Arrange
            const bet = {
                uid: "player1",
                name: "test",
                time: new Date(),
                freeBet: false,
                roundId: 123,
                redBlack: { red: 100, black: 200 },
                guaranteedWinStatus: "normal",
                guaranteedLossStatus: "",
                odds: { redBlack: 3 },
            } as RouletteBet;
            const settlementResult = { redBlack: ["red"] } as SettlementResult;
            const result = 1;

            // Act
            const metadata = consumer.createMetadata({ bet, settlementResult, result });

            // Assert
            expect(metadata.BetDetails).toHaveLength(2);
            expect(metadata.BetDetails[0]).toEqual({
                ChoiceId: 38, // red choice ID
                ValidBetAmount: 100,
                TotalAmount: 100,
                TotalWin: 300, // 100 * 3 odds
            });
            expect(metadata.BetDetails[1]).toEqual({
                ChoiceId: 39, // black choice ID
                ValidBetAmount: 200,
                TotalAmount: 200,
                TotalWin: 0, // not winning
            });
            expect(metadata.Result).toBe("1");
            expect(metadata.GuaranteedWinStatus).toBe("normal");
            expect(metadata.GuaranteedWinTriggered).toBe(true);
            expect(metadata.GuaranteedLossStatus).toBe("existed");
            expect(metadata.GuaranteedLossTriggered).toBe(false);
        });

        it("should handle bet without guaranteed status", () => {
            // Arrange
            const bet = {
                uid: "player1",
                name: "test",
                time: new Date(),
                freeBet: false,
                roundId: 123,
                redBlack: { red: 100 },
            } as RouletteBet;
            const settlementResult = { redBlack: ["red"] } as SettlementResult;
            const result = 1;

            // Act
            const metadata = consumer.createMetadata({ bet, settlementResult, result });

            // Assert
            expect(metadata.GuaranteedWinStatus).toBe("existed");
            expect(metadata.GuaranteedWinTriggered).toBe(false);
            expect(metadata.GuaranteedLossStatus).toBe("existed");
            expect(metadata.GuaranteedLossTriggered).toBe(false);
        });
    });

    describe("captureBetHistory", () => {
        it("should capture bet history when accumulated days > 0", () => {
            // Arrange
            const uid = "player1";
            const roundId = 123;
            const betResult = { totalBetAmount: 100, totalWin: 200 };
            const time = new Date();
            const guaranteedFeature = {
                guaranteedWinStatus: "normal",
                guaranteedLossStatus: "",
            } as GuaranteedStatus;

            mockGameData.playerBetHistory[uid] = [
                {
                    totalAmount: 50,
                    betwin: 100,
                    time: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                    guaranteedWinStatus: "",
                    guaranteedLossStatus: "",
                    roundId: 100,
                },
                {
                    totalAmount: 75,
                    betwin: 150,
                    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                    guaranteedWinStatus: "",
                    guaranteedLossStatus: "",
                    roundId: 101,
                },
            ];

            // Act
            consumer.captureBetHistory(uid, roundId, betResult, time, guaranteedFeature);

            // Assert
            expect(mockGameData.playerBetHistory[uid]).toHaveLength(2);
            expect(mockGameData.playerBetHistory[uid][0]).toEqual({
                totalAmount: 100,
                betwin: 200,
                time,
                guaranteedWinStatus: "normal",
                guaranteedLossStatus: "",
                roundId: 123,
            });
            expect(mockGameData.playerBetHistory[uid][1].roundId).toBe(101); // Kept the recent one
        });

        it("should initialize empty array when accumulated days <= 0", () => {
            // Arrange
            mockGameData.accumulatedDays = 0;
            const uid = "player1";
            const roundId = 123;
            const betResult = { totalBetAmount: 100, totalWin: 200 };
            const time = new Date();
            const guaranteedFeature = null;

            // Act
            consumer.captureBetHistory(uid, roundId, betResult, time, guaranteedFeature);

            // Assert
            expect(mockGameData.playerBetHistory[uid]).toEqual([]);
        });

        it("should handle null guaranteed feature", () => {
            // Arrange
            const uid = "player1";
            const roundId = 123;
            const betResult = { totalBetAmount: 100, totalWin: 200 };
            const time = new Date();
            const guaranteedFeature = null;

            // Act
            consumer.captureBetHistory(uid, roundId, betResult, time, guaranteedFeature);

            // Assert
            expect(mockGameData.playerBetHistory[uid][0].guaranteedWinStatus).toBe(Constants.guaranteedStatus.exited);
            expect(mockGameData.playerBetHistory[uid][0].guaranteedLossStatus).toBe(Constants.guaranteedStatus.exited);
        });
    });

    describe("calculateBetResult", () => {
        it("should calculate bet result correctly", () => {
            // Arrange
            const settlementResult = { redBlack: ["red"], dozen: ["1"] } as SettlementResult;
            const bet = {
                redBlack: { red: 100, black: 200 },
                dozen: { "1": 300 },
            } as any;
            const odds = { redBlack: 2, dozen: 3 };

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(600);
            expect(result.totalWin).toBe(1100);
            expect(result.netWin).toBe(700);
            expect(result.totalLost).toBe(200);
            expect(result.winningByChoices).toEqual({
                redBlack: { red: 200 },
                dozen: { "1": 900 },
            });
        });

        it("should handle bet with no winning choices", () => {
            // Arrange
            const settlementResult = { redBlack: ["black"] } as SettlementResult;
            const bet = { redBlack: { red: 100 } } as any;
            const odds = { redBlack: 2 };

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(0);
            expect(result.netWin).toBe(0);
            expect(result.totalLost).toBe(100);
            expect(result.winningByChoices).toEqual({});
        });

        it("should handle bet with missing odds", () => {
            // Arrange
            const settlementResult = { redBlack: ["red"] } as SettlementResult;
            const bet = { redBlack: { red: 100 } } as any;
            const odds = {};

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalWin).toBe(0); // No odds available
        });

        it("should round totalWin and netWin to 2 decimal places", () => {
            // Arrange
            const settlementResult = { redBlack: ["red"] } as SettlementResult;
            const bet = { redBlack: { red: 100 } } as any;
            const odds = { redBlack: 2.333 };

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalWin).toBe(233.3);
            expect(result.netWin).toBe(133.3);
        });
    });
});
