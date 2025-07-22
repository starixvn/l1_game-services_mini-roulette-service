import RouletteRoundQuery from "../../../src/query-apis/roulette-round-query";

// Mock dependencies
jest.mock("sc-game-base", () => ({
    Core: {
        QueryApis: {
            RoundQuery: class {
                roundsRepository: any;
                constructor(props: any) {
                    this.roundsRepository = props.roundsRepository;
                }
            },
        },
    },
}));

describe("RouletteRoundQuery", () => {
    let query: RouletteRoundQuery;
    let mockRoundsRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRoundsRepository = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn(),
                }),
            }),
        };

        query = new RouletteRoundQuery({}, {});
        query.roundsRepository = mockRoundsRepository;
    });

    describe("getListByPlayerId", () => {
        it("should return rounds list for player with correct format", async () => {
            // Arrange
            const uid = "player1";
            const limit = 10;
            const mockRounds = [
                {
                    id: 123,
                    result: 15,
                    settlementResult: {
                        straightUp: ["15"],
                        redBlack: ["red"],
                        dozen: ["2"],
                        oddEven: ["odd"],
                    },
                },
                {
                    id: 122,
                    result: 0,
                    settlementResult: {
                        straightUp: ["0"],
                        redBlack: ["black"],
                        dozen: ["1"],
                        oddEven: ["even"],
                    },
                },
                {
                    id: 121,
                    result: 36,
                    settlementResult: {
                        straightUp: ["36"],
                        redBlack: ["red"],
                        dozen: ["3"],
                        oddEven: ["even"],
                    },
                },
            ];

            const mockExec = jest.fn().mockResolvedValue(mockRounds);
            mockRoundsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockExec }),
            });

            // Act
            const result = await query.getListByPlayerId(uid, limit);

            // Assert
            expect(mockRoundsRepository.find).toHaveBeenCalledWith(
                { uid },
                { id: true, result: true, settlementResult: true, _id: false },
                { sort: { id: -1 }, limit: limit }
            );
            expect(mockExec).toHaveBeenCalled();
            expect(result).toEqual([
                {
                    roundId: 123,
                    result: 15,
                    settlementResult: {
                        straightUp: ["15"],
                        redBlack: ["red"],
                        dozen: ["2"],
                        oddEven: ["odd"],
                    },
                },
                {
                    roundId: 122,
                    result: 0,
                    settlementResult: {
                        straightUp: ["0"],
                        redBlack: ["black"],
                        dozen: ["1"],
                        oddEven: ["even"],
                    },
                },
                {
                    roundId: 121,
                    result: 36,
                    settlementResult: {
                        straightUp: ["36"],
                        redBlack: ["red"],
                        dozen: ["3"],
                        oddEven: ["even"],
                    },
                },
            ]);
        });

        it("should return empty array when no rounds found", async () => {
            // Arrange
            const uid = "player1";
            const limit = 10;
            const mockExec = jest.fn().mockResolvedValue([]);
            mockRoundsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: mockExec }),
            });

            // Act
            const result = await query.getListByPlayerId(uid, limit);

            // Assert
            expect(result).toEqual([]);
        });
    });
});
