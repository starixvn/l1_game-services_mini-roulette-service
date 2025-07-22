import RouletteBetQuery from "../../../src/query-apis/roulette-bet-query";

// Mock dependencies
jest.mock("../../../src/helpers/day-helper", () => ({
    getStartDate: jest.fn().mockReturnValue(new Date("2025-01-01T00:00:00.000Z")),
}));

describe("RouletteBetQuery", () => {
    let query: RouletteBetQuery;
    let mockBetsRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBetsRepository = {
            aggregate: jest.fn().mockReturnValue({
                exec: jest.fn(),
            }),
        };

        query = new RouletteBetQuery(mockBetsRepository);
    });

    describe("constructor", () => {
        it("should initialize with betsRepository", () => {
            // Assert
            expect(query).toBeInstanceOf(RouletteBetQuery);
            expect(query.betsRepository).toBe(mockBetsRepository);
        });
    });

    describe("getBetHistoryGroupByPlayer", () => {
        it("should return bet history grouped by player", async () => {
            // Arrange
            const totalDays = 7;
            const mockAggregateResults = [
                {
                    _id: "player1",
                    bets: [
                        {
                            totalAmount: 100,
                            betwin: 200,
                            time: new Date("2025-01-05T10:00:00.000Z"),
                            guaranteedWinStatus: "normal",
                            guaranteedLossStatus: "",
                            roundId: 123,
                        },
                        {
                            totalAmount: 50,
                            betwin: 0,
                            time: new Date("2025-01-04T15:30:00.000Z"),
                            guaranteedWinStatus: "",
                            guaranteedLossStatus: "weakened",
                            roundId: 122,
                        },
                    ],
                },
                {
                    _id: "player2",
                    bets: [
                        {
                            totalAmount: 200,
                            betwin: 400,
                            time: new Date("2025-01-06T12:00:00.000Z"),
                            guaranteedWinStatus: "",
                            guaranteedLossStatus: "",
                            roundId: 124,
                        },
                    ],
                },
            ];

            const mockExec = jest.fn().mockResolvedValue(mockAggregateResults);
            mockBetsRepository.aggregate.mockReturnValue({ exec: mockExec });

            // Act
            const result = await query.getBetHistoryGroupByPlayer(totalDays);

            // Assert
            expect(mockBetsRepository.aggregate).toHaveBeenCalledWith([
                {
                    $match: {
                        paid: true,
                        time: { $gte: new Date("2025-01-01T00:00:00.000Z") },
                    },
                },
                {
                    $sort: {
                        time: -1,
                    },
                },
                {
                    $group: {
                        _id: "$uid",
                        bets: {
                            $push: {
                                totalAmount: "$totalAmount",
                                betwin: "$betwin",
                                time: "$time",
                                guaranteedWinStatus: "$guaranteedWinStatus",
                                guaranteedLossStatus: "$guaranteedLossStatus",
                                roundId: "$roundId",
                            },
                        },
                    },
                },
            ]);
            expect(mockExec).toHaveBeenCalled();
            expect(result).toEqual({
                player1: [
                    {
                        totalAmount: 100,
                        betwin: 200,
                        time: new Date("2025-01-05T10:00:00.000Z"),
                        guaranteedWinStatus: "normal",
                        guaranteedLossStatus: "",
                        roundId: 123,
                    },
                    {
                        totalAmount: 50,
                        betwin: 0,
                        time: new Date("2025-01-04T15:30:00.000Z"),
                        guaranteedWinStatus: "",
                        guaranteedLossStatus: "weakened",
                        roundId: 122,
                    },
                ],
                player2: [
                    {
                        totalAmount: 200,
                        betwin: 400,
                        time: new Date("2025-01-06T12:00:00.000Z"),
                        guaranteedWinStatus: "",
                        guaranteedLossStatus: "",
                        roundId: 124,
                    },
                ],
            });
        });

        it("should return empty object when no bets found", async () => {
            // Arrange
            const totalDays = 7;
            const mockExec = jest.fn().mockResolvedValue([]);
            mockBetsRepository.aggregate.mockReturnValue({ exec: mockExec });

            // Act
            const result = await query.getBetHistoryGroupByPlayer(totalDays);

            // Assert
            expect(result).toEqual({});
        });
    });
});
