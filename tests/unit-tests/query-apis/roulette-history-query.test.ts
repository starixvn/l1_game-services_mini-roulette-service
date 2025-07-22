import RouletteHistoryQuery from "../../../src/query-apis/roulette-history-query";
import { RouletteBet } from "../../../src/types";

// Mock dependencies
jest.mock("sc-game-base", () => ({
    Core: {
        QueryApis: {
            HistoryQuery: class {
                betsRepository: any;
                betLogsRepository: any;
                roundQuery: any;
                constructor(props: any) {}
                queryHistory() {
                    return {};
                }
                getBetProjection() {
                    return {};
                }
                convertBet() {
                    return {};
                }
                convertBetLogs() {
                    return [];
                }
            },
        },
    },
}));

describe("RouletteHistoryQuery", () => {
    let query: RouletteHistoryQuery;
    let mockBetsRepository: any;
    let mockBetLogsRepository: any;
    let mockRoundQuery: any;
    let mockPlayer: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBetsRepository = {
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: jest.fn() }),
            }),
        };
        mockBetLogsRepository = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: jest.fn() }),
            }),
        };
        mockRoundQuery = {
            getOne: jest.fn(),
        };

        query = new RouletteHistoryQuery(mockRoundQuery, null, null);
        query.betsRepository = mockBetsRepository;
        query.betLogsRepository = mockBetLogsRepository;
        query.roundQuery = mockRoundQuery;

        mockPlayer = {
            UID: "player1",
            profile: { name: "TestPlayer" },
        };

        // Mock inherited methods
        query.queryHistory = jest.fn().mockReturnValue({ history: { betLogs: [], page: 1, pageSize: 10, total: 0 } });
        query.getBetProjection = jest.fn().mockReturnValue({ _id: false, uid: true, totalAmount: true });
        query.convertBet = jest.fn().mockReturnValue({ betId: "bet123", amount: 100 });
        query.convertBetLogs = jest.fn().mockReturnValue([{ logId: "log123" }]);
    });

    describe("queryHistoryByDate", () => {
        it("should query history with date filter when date is provided", async () => {
            // Arrange
            const page = 1;
            const pageSize = 10;
            const date = "2025-01-15";
            const mockBets = [
                {
                    _id: "bet1",
                    uid: "player1",
                    totalAmount: 100,
                    roundId: 123,
                    time: new Date("2025-01-15T10:00:00.000Z"),
                },
                {
                    _id: "bet2",
                    uid: "player1",
                    totalAmount: 200,
                    roundId: 124,
                    time: new Date("2025-01-15T15:30:00.000Z"),
                },
            ];
            const mockRounds = [
                { id: 123, result: 15, settlementResult: { redBlack: ["red"] } },
                { id: 124, result: 0, settlementResult: { redBlack: ["black"] } },
            ];
            const mockBetLogs = [
                { _id: "log1", roundId: 123, betChoices: { redBlack: { red: 100 } } },
                { _id: "log2", roundId: 124, betChoices: { redBlack: { black: 200 } } },
            ];

            const mockCountExec = jest.fn().mockResolvedValue(2);
            mockBetsRepository.countDocuments.mockReturnValue({ exec: mockCountExec });

            const mockFindExec = jest.fn().mockResolvedValue(mockBets);
            mockBetsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockFindExec }),
            });

            mockRoundQuery.getOne.mockResolvedValueOnce(mockRounds[0]).mockResolvedValueOnce(mockRounds[1]);

            const mockBetLogsExec = jest.fn().mockResolvedValueOnce([mockBetLogs[0]]).mockResolvedValueOnce([mockBetLogs[1]]);
            mockBetLogsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockBetLogsExec }),
            });

            // Act
            const result = await query.queryHistoryByDate(mockPlayer, page, pageSize, date);

            // Assert
            expect(mockBetsRepository.countDocuments).toHaveBeenCalledWith({
                uid: "player1",
                paid: true,
                time: {
                    $gte: new Date("2025-01-15T00:00:00.000Z"),
                    $lte: new Date("2025-01-15T23:59:59.000Z"),
                },
            });
            expect(mockCountExec).toHaveBeenCalled();

            expect(mockBetsRepository.find).toHaveBeenCalledWith(
                {
                    uid: "player1",
                    paid: true,
                    time: {
                        $gte: new Date("2025-01-15T00:00:00.000Z"),
                        $lte: new Date("2025-01-15T23:59:59.000Z"),
                    },
                },
                { _id: false, uid: true, totalAmount: true },
                { sort: { _id: -1 }, skip: 0, limit: 10 }
            );
            expect(mockFindExec).toHaveBeenCalled();

            expect(mockRoundQuery.getOne).toHaveBeenCalledTimes(2);
            expect(mockRoundQuery.getOne).toHaveBeenCalledWith(123, { _id: false });
            expect(mockRoundQuery.getOne).toHaveBeenCalledWith(124, { _id: false });

            expect(mockBetLogsRepository.find).toHaveBeenCalledTimes(2);
            expect(mockBetLogsRepository.find).toHaveBeenCalledWith(
                { roundId: 123, uid: "player1" },
                {
                    _id: false,
                    uid: false,
                    roundId: false,
                    playerId: false,
                    siteId: false,
                    __v: false,
                },
                { sort: { _id: -1 } }
            );

            expect(result).toEqual({
                history: {
                    betLogs: [
                        {
                            betId: "bet123",
                            amount: 100,
                            phien: 123,
                            result: 15,
                            settlementResult: { redBlack: ["red"] },
                            betLogDetails: [{ logId: "log123" }],
                        },
                        {
                            betId: "bet123",
                            amount: 100,
                            phien: 124,
                            result: 0,
                            settlementResult: { redBlack: ["black"] },
                            betLogDetails: [{ logId: "log123" }],
                        },
                    ],
                    page: 1,
                    pageSize: 10,
                    total: 2,
                },
            });
        });

        it("should call parent queryHistory when no date is provided", async () => {
            // Arrange
            const page = 1;
            const pageSize = 10;
            const date = "";

            // Act
            const result = await query.queryHistoryByDate(mockPlayer, page, pageSize, date);

            // Assert
            expect(query.queryHistory).toHaveBeenCalledWith(mockPlayer, page, pageSize);
            expect(mockBetsRepository.countDocuments).not.toHaveBeenCalled();
            expect(result).toEqual({ history: { betLogs: [], page: 1, pageSize: 10, total: 0 } });
        });

        it("should handle empty bet results", async () => {
            // Arrange
            const page = 1;
            const pageSize = 10;
            const date = "2025-01-15";
            const mockBets: RouletteBet[] = [];

            const mockCountExec = jest.fn().mockResolvedValue(0);
            mockBetsRepository.countDocuments.mockReturnValue({ exec: mockCountExec });

            const mockFindExec = jest.fn().mockResolvedValue(mockBets);
            mockBetsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockFindExec }),
            });

            // Act
            const result = await query.queryHistoryByDate(mockPlayer, page, pageSize, date);

            // Assert
            expect(mockRoundQuery.getOne).not.toHaveBeenCalled();
            expect(mockBetLogsRepository.find).not.toHaveBeenCalled();
            expect(result.history?.betLogs).toEqual([]);
            expect(result.history?.total).toBe(0);
        });
    });

    describe("getBetLogDetails", () => {
        it("should return bet log details for player and round", async () => {
            // Arrange
            const roundId = 123;
            const mockBetLogs = [
                {
                    _id: "log1",
                    roundId: 123,
                    uid: "player1",
                    betChoices: { redBlack: { red: 100 } },
                    time: new Date("2025-01-15T10:00:00.000Z"),
                },
                {
                    _id: "log2",
                    roundId: 123,
                    uid: "player1",
                    betChoices: { dozen: { "1": 200 } },
                    time: new Date("2025-01-15T10:01:00.000Z"),
                },
            ];

            const mockExec = jest.fn().mockResolvedValue(mockBetLogs);
            mockBetLogsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockExec }),
            });

            // Act
            const result = await query.getBetLogDetails(mockPlayer, roundId);

            // Assert
            expect(mockBetLogsRepository.find).toHaveBeenCalledWith(
                { roundId: 123, uid: "player1" },
                {
                    _id: false,
                    uid: false,
                    roundId: false,
                    playerId: false,
                    siteId: false,
                    __v: false,
                },
                { sort: { _id: -1 } }
            );
            expect(mockExec).toHaveBeenCalled();
            expect(result).toEqual(mockBetLogs);
        });
    });
});
