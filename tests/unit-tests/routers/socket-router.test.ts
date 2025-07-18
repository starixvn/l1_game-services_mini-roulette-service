import SocketRouter from "../../../src/routers/socket-router";
import { Core } from "sc-game-base";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Core: {
        Routers: {
            BaseSocketRouter: class {
                props: any;

                constructor(props: any) {
                    this.props = props;
                }
                init(socketClient: any) {}
                verify() {
                    return true;
                }
            },
        },
    },
}));

describe("SocketRouter", () => {
    let router: SocketRouter;
    let mockProps: any;
    let mockSocketClient: any;
    let mockHandleActionSettleConsumer: any;
    let mockLeaderboardConsumer: any;
    let mockRebetConsumer: any;
    let mockLangliveUserSettingConsumer: any;
    let mockHistoryQuery: any;
    let mockGameData: any;
    let mockDefinition: any;
    let mockLogService: any;

    beforeEach(() => {
        mockHandleActionSettleConsumer = {
            consume: jest.fn(),
        };
        mockLeaderboardConsumer = {
            consume: jest.fn(),
        };
        mockRebetConsumer = {
            consume: jest.fn(),
        };
        mockLangliveUserSettingConsumer = {
            updateLeaderboardSettings: jest.fn(),
        };
        mockHistoryQuery = {
            queryHistoryByDate: jest.fn(),
        };
        mockGameData = {
            realPlayers: {
                "socket-id-1": { UID: "user-1", name: "Player1" },
                "socket-id-2": { UID: "user-2", name: "Player2" },
            },
        };
        mockDefinition = {
            name: "roulette",
            historyPageSize: 10,
        };
        mockLogService = {
            logError: jest.fn(),
        };

        mockProps = {
            handleActionSettleConsumer: mockHandleActionSettleConsumer,
            leaderboardConsumer: mockLeaderboardConsumer,
            rebetConsumer: mockRebetConsumer,
            langliveUserSettingConsumer: mockLangliveUserSettingConsumer,
            historyQuery: mockHistoryQuery,
            gameData: mockGameData,
            definition: mockDefinition,
            logService: mockLogService,
        };

        mockSocketClient = {
            id: "socket-id-1",
            on: jest.fn(),
            emit: jest.fn(),
        };

        router = new SocketRouter(mockProps);
        router.historyQuery = mockHistoryQuery;
        router.gameData = mockGameData;
        router.definition = mockDefinition;
        router.logService = mockLogService;
        router.socketClient = mockSocketClient;
    });

    describe("constructor", () => {
        it("should initialize with all required consumers", () => {
            // Assert
            expect(router.handleActionSettleConsumer).toBe(mockHandleActionSettleConsumer);
            expect(router.leaderboardConsumer).toBe(mockLeaderboardConsumer);
            expect(router.rebetConsumer).toBe(mockRebetConsumer);
            expect(router.langliveUserSettingConsumer).toBe(mockLangliveUserSettingConsumer);
        });
    });

    describe("init", () => {
        it("should call parent init method", () => {
            // Arrange
            Core.Routers.BaseSocketRouter.prototype.init = jest.fn();

            // Act
            router.init(mockSocketClient);

            // Assert
            expect(Core.Routers.BaseSocketRouter.prototype.init).toHaveBeenCalledWith(mockSocketClient);
        });

        it("should register all socket event handlers", () => {
            // Act
            router.init(mockSocketClient);

            // Assert
            expect(mockSocketClient.on).toHaveBeenCalledWith("settle", expect.any(Function));
            expect(mockSocketClient.on).toHaveBeenCalledWith("getLeaderboard", expect.any(Function));
            expect(mockSocketClient.on).toHaveBeenCalledWith("rebet", expect.any(Function));
            expect(mockSocketClient.on).toHaveBeenCalledWith("updateLeaderboardSettings", expect.any(Function));
        });
    });

    describe("handleGetHistory", () => {
        let mockPayload: any;

        beforeEach(() => {
            mockPayload = {
                page: 1,
                date: "2023-01-01",
            };
        });

        it("should query history and emit result when verification passes", async () => {
            // Arrange
            const mockHistory = [{ id: 1, result: 15 }];
            mockHistoryQuery.queryHistoryByDate.mockResolvedValue(mockHistory);

            // Act
            await router.handleGetHistory(mockPayload);

            // Assert
            expect(mockHistoryQuery.queryHistoryByDate).toHaveBeenCalledWith(mockGameData.realPlayers["socket-id-1"], 1, 10, "2023-01-01");
            expect(mockSocketClient.emit).toHaveBeenCalledWith("roulette", mockHistory);
        });

        it("should not query history when verification fails", async () => {
            // Arrange
            jest.spyOn(router, "verify").mockReturnValueOnce(false);

            // Act
            await router.handleGetHistory(mockPayload);

            // Assert
            expect(mockHistoryQuery.queryHistoryByDate).not.toHaveBeenCalled();
            expect(mockSocketClient.emit).not.toHaveBeenCalled();
        });

        it("should handle error and log it", async () => {
            // Arrange
            const error = new Error("Database error");
            mockHistoryQuery.queryHistoryByDate.mockRejectedValue(error);

            // Act
            await router.handleGetHistory(mockPayload);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });

    describe("handleActionSettle", () => {
        it("should call consumer when verification passes", () => {
            // Act
            router.handleActionSettle();

            // Assert
            expect(mockHandleActionSettleConsumer.consume).toHaveBeenCalledWith(mockGameData.realPlayers["socket-id-1"]);
        });

        it("should not call consumer when verification fails", () => {
            // Arrange
            jest.spyOn(router, "verify").mockReturnValueOnce(false);

            // Act
            router.handleActionSettle();

            // Assert
            expect(mockHandleActionSettleConsumer.consume).not.toHaveBeenCalled();
        });

        it("should handle error and log it", () => {
            // Arrange
            const error = new Error("Settle error");
            mockHandleActionSettleConsumer.consume.mockImplementation(() => {
                throw error;
            });

            // Act
            router.handleActionSettle();

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });

    describe("handleGetLeaderboard", () => {
        let mockPayload: any;

        beforeEach(() => {
            mockPayload = { top: 20 };
        });

        it("should get leaderboard and emit result when verification passes", async () => {
            // Arrange
            const mockLeaderboard = [{ rank: 1, player: "Player1", score: 1000 }];
            mockLeaderboardConsumer.consume.mockResolvedValue(mockLeaderboard);

            // Act
            await router.handleGetLeaderboard(mockPayload);

            // Assert
            expect(mockLeaderboardConsumer.consume).toHaveBeenCalledWith(mockGameData.realPlayers["socket-id-1"], { top: 20 });
            expect(mockSocketClient.emit).toHaveBeenCalledWith("roulette", {
                leaderboard: mockLeaderboard,
            });
        });

        it("should use default top value when not provided", async () => {
            // Arrange
            const mockLeaderboard = [{ rank: 1, player: "Player1", score: 1000 }];
            mockLeaderboardConsumer.consume.mockResolvedValue(mockLeaderboard);

            // Act
            await router.handleGetLeaderboard({});

            // Assert
            expect(mockLeaderboardConsumer.consume).toHaveBeenCalledWith(mockGameData.realPlayers["socket-id-1"], { top: 30 });
        });

        it("should not get leaderboard when verification fails", async () => {
            // Arrange
            jest.spyOn(router, "verify").mockReturnValueOnce(false);

            // Act
            await router.handleGetLeaderboard(mockPayload);

            // Assert
            expect(mockLeaderboardConsumer.consume).not.toHaveBeenCalled();
            expect(mockSocketClient.emit).not.toHaveBeenCalled();
        });

        it("should handle error and log it", async () => {
            // Arrange
            const error = new Error("Leaderboard error");
            mockLeaderboardConsumer.consume.mockRejectedValue(error);

            // Act
            await router.handleGetLeaderboard(mockPayload);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });

    describe("handleRebet", () => {
        let mockPayload: any;

        beforeEach(() => {
            mockPayload = { betAmount: 100, betType: "straightUp" };
        });

        it("should call consumer when verification passes", () => {
            // Act
            router.handleRebet(mockPayload);

            // Assert
            expect(mockRebetConsumer.consume).toHaveBeenCalledWith(mockGameData.realPlayers["socket-id-1"], mockPayload);
        });

        it("should not call consumer when verification fails", () => {
            // Arrange
            jest.spyOn(router, "verify").mockReturnValueOnce(false);

            // Act
            router.handleRebet(mockPayload);

            // Assert
            expect(mockRebetConsumer.consume).not.toHaveBeenCalled();
        });

        it("should handle error and log it", () => {
            // Arrange
            const error = new Error("Rebet error");
            mockRebetConsumer.consume.mockImplementation(() => {
                throw error;
            });

            // Act
            router.handleRebet(mockPayload);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });

    describe("handleUpdateLeaderboardSettings", () => {
        let mockPayload: any;

        beforeEach(() => {
            mockPayload = { hideAvatar: true, hideName: false };
        });

        it("should update settings when both parameters are provided and verification passes", () => {
            // Act
            router.handleUpdateLeaderboardSettings(mockPayload);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).toHaveBeenCalledWith("user-1", mockPayload);
        });

        it("should not update settings when verification fails", () => {
            // Arrange
            jest.spyOn(router, "verify").mockReturnValueOnce(false);

            // Act
            router.handleUpdateLeaderboardSettings(mockPayload);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).not.toHaveBeenCalled();
        });

        it("should not update settings when hideAvatar is undefined", () => {
            // Arrange
            const payloadWithoutAvatar = { hideName: false };

            // Act
            router.handleUpdateLeaderboardSettings(payloadWithoutAvatar);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).not.toHaveBeenCalled();
        });

        it("should not update settings when hideName is undefined", () => {
            // Arrange
            const payloadWithoutName = { hideAvatar: true };

            // Act
            router.handleUpdateLeaderboardSettings(payloadWithoutName);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).not.toHaveBeenCalled();
        });

        it("should handle error and log it", () => {
            // Arrange
            const error = new Error("Settings update error");
            mockLangliveUserSettingConsumer.updateLeaderboardSettings.mockImplementation(() => {
                throw error;
            });

            // Act
            router.handleUpdateLeaderboardSettings(mockPayload);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
        });
    });
});
