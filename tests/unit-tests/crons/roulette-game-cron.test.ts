import RouletteGameCron from "../../../src/crons/roulette-game-cron";
import { RouletteGameData } from "../../../src/roulette-game-data";
import { RouletteBetQuery } from "../../../src/query-apis";
import RouletteSettleGameRoundConsumer from "../../../src/consumers/roulette-settle-game-round-consumer";
import { GuaranteedFeature } from "../../../src/types";
import { getOrDefault } from "sc-game-base/src/core/game-management-api";

// Mock dependencies
jest.mock("sc-game-base", () => ({
    Core: {
        Crons: {
            BaseGameCron: class {
                gameData: any;
                settleGameRoundConsumer: any;

                constructor(props: any) {
                    this.gameData = props.gameData;
                    this.settleGameRoundConsumer = props.settleGameRoundConsumer;
                }
                getSettingForNewRound() {}
            },
        },
    },
}));
jest.mock("sc-game-base/src/core/game-management-api", () => ({
    getOrDefault: jest.fn(),
}));

jest.mock("../../../src/query-apis", () => ({
    RouletteBetQuery: jest.fn(),
}));
jest.mock("../../../src/roulette-game-data", () => ({
    RouletteGameData: class {},
}));

jest.mock("../../../src/consumers/roulette-settle-game-round-consumer", () => {
    return jest.fn().mockImplementation(() => ({
        settleUnsettledBets: jest.fn(),
        settleRoundById: jest.fn(),
    }));
});

describe("RouletteGameCron", () => {
    let cron: RouletteGameCron;
    let mockGameData: RouletteGameData;
    let mockBetQuery: jest.Mocked<RouletteBetQuery>;
    let mockSettleGameRoundConsumer: jest.Mocked<RouletteSettleGameRoundConsumer>;
    let mockGetOrDefault: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = new RouletteGameData(30000);
        mockBetQuery = {
            getBetHistoryGroupByPlayer: jest.fn(),
        } as any;
        mockSettleGameRoundConsumer = new RouletteSettleGameRoundConsumer({}) as any;
        mockGetOrDefault = getOrDefault;

        cron = new RouletteGameCron({
            gameData: mockGameData,
            betQuery: mockBetQuery,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
        });

        // Mock inherited properties and methods
        cron.roundIdConsumer = { initRoundId: jest.fn() } as any;
        cron.gameManagementApiClient = {
            currencyGroupGames: {
                getGuaranteedFeatureConfigsByGameId: jest.fn(),
            },
        } as any;
        cron.definition = { id: "test-game-id" } as any;
        cron.startCron = jest.fn();
    });

    describe("constructor", () => {
        it("should initialize with betQuery", () => {
            // Assert
            expect(cron).toBeInstanceOf(RouletteGameCron);
            expect(cron.betQuery).toBe(mockBetQuery);
        });
    });

    describe("start", () => {
        it("should initialize round and start cron", async () => {
            // Arrange
            const mockInitRoundId = jest.fn();
            const mockGetSettingForNewRound = jest.fn();
            const mockUpdateExchangeRates = jest.fn();
            const mockSettleUnsettledBets = jest.fn();
            const mockStartCron = jest.fn();

            cron.roundIdConsumer.initRoundId = mockInitRoundId;
            cron.getSettingForNewRound = mockGetSettingForNewRound;
            cron.updateExchangeRates = mockUpdateExchangeRates;
            mockSettleGameRoundConsumer.settleUnsettledBets = mockSettleUnsettledBets;
            cron.startCron = mockStartCron;

            // Act
            await cron.start();

            // Assert
            expect(mockInitRoundId).toHaveBeenCalled();
            expect(mockGetSettingForNewRound).toHaveBeenCalled();
            expect(mockUpdateExchangeRates).toHaveBeenCalled();
            expect(mockSettleUnsettledBets).toHaveBeenCalled();
            expect(mockStartCron).toHaveBeenCalled();
        });
    });

    describe("getSettingForNewRound", () => {
        it("should call parent method and additional setup methods", async () => {
            // Arrange
            const mockGetGuaranteedFeatureConfigs = jest.fn();
            const mockGetPlayerBetHistory = jest.fn();

            const parentGetSettingForNewRoundSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(cron)), "getSettingForNewRound");
            cron.getGuaranteedFeatureConfigs = mockGetGuaranteedFeatureConfigs;
            cron.getPlayerBetHistory = mockGetPlayerBetHistory;

            // Act
            await cron.getSettingForNewRound();

            // Assert
            expect(parentGetSettingForNewRoundSpy).toHaveBeenCalled();
            expect(mockGetGuaranteedFeatureConfigs).toHaveBeenCalled();
            expect(mockGetPlayerBetHistory).toHaveBeenCalled();
        });
    });

    describe("getGuaranteedFeatureConfigs", () => {
        it("should fetch and process guaranteed feature configs", async () => {
            // Arrange
            const mockConfigs = [
                {
                    groupId: "group1",
                    value: {
                        gamingDays: 3,
                        totalDays: 7,
                        guaranteedWin: {
                            enabled: true,
                            floating: 10,
                            thresholdSettings: [],
                        },
                    } as GuaranteedFeature,
                },
                {
                    groupId: "group2",
                    value: {
                        gamingDays: 5,
                        totalDays: 10,
                        guaranteedLoss: {
                            enabled: true,
                            floating: 5,
                            thresholdSettings: [],
                        },
                    } as GuaranteedFeature,
                },
            ] as any;
            mockGetOrDefault.mockResolvedValue(mockConfigs);
            cron.definition = { id: 134 } as any;

            // Act
            await cron.getGuaranteedFeatureConfigs();

            // Assert
            expect(mockGetOrDefault).toHaveBeenCalledWith(
                cron.gameManagementApiClient.currencyGroupGames.getGuaranteedFeatureConfigsByGameId(cron.definition.id),
                []
            );
            expect(mockGameData.guaranteedFeature).toEqual({
                group1: mockConfigs[0].value,
                group2: mockConfigs[1].value,
            });
        });
    });

    describe("getPlayerBetHistory", () => {
        it("should fetch bet history when accumulated days change", async () => {
            // Arrange
            const mockGuaranteedFeature = {
                group1: { totalDays: 5 } as GuaranteedFeature,
                group2: { totalDays: 7 } as GuaranteedFeature,
            };
            mockGameData.guaranteedFeature = mockGuaranteedFeature;
            mockGameData.accumulatedDays = 5; // Different from max totalDays (7)
            const mockBetHistory = { player1: [], player2: [] };
            mockBetQuery.getBetHistoryGroupByPlayer.mockResolvedValue(mockBetHistory);

            // Act
            await cron.getPlayerBetHistory();

            // Assert
            expect(mockGameData.accumulatedDays).toBe(7);
            expect(mockBetQuery.getBetHistoryGroupByPlayer).toHaveBeenCalledWith(7);
            expect(mockGameData.playerBetHistory).toBe(mockBetHistory);
        });

        it("should not fetch bet history when accumulated days are the same", async () => {
            // Arrange
            const mockGuaranteedFeature = {
                group1: { totalDays: 7 } as GuaranteedFeature,
            };
            mockGameData.guaranteedFeature = mockGuaranteedFeature;
            mockGameData.accumulatedDays = 7; // Same as max totalDays
            mockGameData.playerBetHistory = { existing: [] };

            // Act
            await cron.getPlayerBetHistory();

            // Assert
            expect(mockGameData.accumulatedDays).toBe(7);
            expect(mockBetQuery.getBetHistoryGroupByPlayer).not.toHaveBeenCalled();
            expect(mockGameData.playerBetHistory).toEqual({ existing: [] });
        });

        it("should set empty object when no guaranteed features exist", async () => {
            // Arrange
            mockGameData.guaranteedFeature = {};
            mockGameData.accumulatedDays = 5;
            mockGameData.playerBetHistory = { existing: [] };

            // Act
            await cron.getPlayerBetHistory();

            // Assert
            expect(mockGameData.accumulatedDays).toBe(0);
            expect(mockBetQuery.getBetHistoryGroupByPlayer).not.toHaveBeenCalled();
            expect(mockGameData.playerBetHistory).toEqual({});
        });
    });

    describe("proceed", () => {
        beforeEach(() => {
            cron.definition = {
                durations: { wholeRound: 60 },
            } as any;
            cron.gameData.remainingTime = 60;
            cron.gameData.disabled = false;
            cron.gameData.ingame = {};
            cron.checkGameStatus = jest.fn();
        });

        it("should check game status when remaining time equals whole round", async () => {
            // Arrange
            const mockCheckGameStatus = jest.fn();
            cron.checkGameStatus = mockCheckGameStatus;

            // Act
            await cron.proceed();

            // Assert
            expect(mockCheckGameStatus).toHaveBeenCalled();
            expect(cron.gameData.remainingTime).toBe(59);
        });

        it("should not check game status when remaining time is not whole round", async () => {
            // Arrange
            cron.gameData.remainingTime = 25;
            const mockCheckGameStatus = jest.fn();
            cron.checkGameStatus = mockCheckGameStatus;

            // Act
            await cron.proceed();

            // Assert
            expect(mockCheckGameStatus).not.toHaveBeenCalled();
            expect(cron.gameData.remainingTime).toBe(24);
        });

        it("should not decrease remaining time when game is disabled", async () => {
            // Arrange
            cron.gameData.disabled = true;
            cron.gameData.remainingTime = 60;

            // Act
            await cron.proceed();

            // Assert
            expect(cron.gameData.remainingTime).toBe(60);
        });

        it("should reset remaining time and settle rounds when remainingTime = 0", async () => {
            // Arrange
            cron.gameData.remainingTime = 0;

            // Act
            await cron.proceed();

            // Assert
            expect(cron.gameData.remainingTime).toBe(60);
        });

        it("should not settle rounds when player conditions are not met", async () => {
            // Arrange
            cron.gameData.remainingTime = -1;
            const mockSettleRoundById = jest.fn();
            mockSettleGameRoundConsumer.settleRoundById = mockSettleRoundById;

            const mockPlayerBet = {
                name: "player1",
                roundId: 123,
                betTracks: {}, // Empty bet tracks
                betQueue: [],
                betProcessing: false,
                settleProcessing: false,
                betStartTime: new Date(),
            };
            cron.gameData.ingame = { player1: mockPlayerBet };

            // Act
            await cron.proceed();

            // Assert
            expect(mockSettleRoundById).not.toHaveBeenCalled();
        });

        it("should handle multiple players for settlement", async () => {
            // Arrange
            cron.gameData.remainingTime = -1;
            const mockSettleRoundById = jest.fn();
            mockSettleGameRoundConsumer.settleRoundById = mockSettleRoundById;

            const mockPlayer1 = {
                name: "player1",
                roundId: 123,
                betTracks: { redBlack: { red: 100 } },
                betQueue: [],
                betProcessing: false,
                settleProcessing: false,
                betStartTime: new Date(Date.now() - 65000),
            };
            const mockPlayer2 = {
                name: "player2",
                roundId: 456,
                betTracks: { dozen: { "1": 200 } },
                betQueue: [],
                betProcessing: false,
                settleProcessing: false,
                betStartTime: new Date(Date.now() - 65000),
            };
            cron.gameData.ingame = { player1: mockPlayer1, player2: mockPlayer2 };

            // Act
            await cron.proceed();

            // Assert
            expect(mockSettleRoundById).toHaveBeenCalledTimes(2);
            expect(mockSettleRoundById).toHaveBeenCalledWith(123, "player1");
            expect(mockSettleRoundById).toHaveBeenCalledWith(456, "player2");
        });
    });
});
