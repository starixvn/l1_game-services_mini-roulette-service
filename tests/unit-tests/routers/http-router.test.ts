import HttpRouter from "../../../src/routers/http-router";
import { Table } from "sc-game-base";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Table: {
        Routers: {
            TableHttpRouter: class {
                appConfigs: any;
                gameData: any;
                historyQuery: any;
                metricQuery: any;
                logService: any;

                constructor(appConfigs: any, gameData: any, historyQuery: any, metricQuery: any, logService: any) {
                    this.appConfigs = appConfigs;
                    this.gameData = gameData;
                    this.historyQuery = historyQuery;
                    this.metricQuery = metricQuery;
                    this.logService = logService;
                }
                verifySession(req: any, res: any, handler: any) {
                    return handler(req, res, { userId: "test-user-id" });
                }
            },
        },
    },
}));

jest.mock("sc-common", () => ({
    utils: {
        authentication: {
            useAuthenticate: jest.fn().mockReturnValue(() => {}),
        },
    },
}));

describe("HttpRouter", () => {
    let router: HttpRouter;
    let mockAppConfigs: any;
    let mockGameData: any;
    let mockHistoryQuery: any;
    let mockMetricQuery: any;
    let mockLogService: any;
    let mockLangliveUserSettingConsumer: any;
    let mockApp: any;
    let mockPublisher: any;
    beforeEach(() => {
        mockAppConfigs = {
            disableSetResult: false,
            sentry: { env: "DEV" },
            apiSettings: { authUrl: "https://auth.test.com" },
            authenticateSettings: { audiences: ["test-audience"] },
        };
        mockGameData = {
            settlementResultFromAdmin: null,
            ingame: {},
            playerBetHistory: {},
        };
        mockHistoryQuery = {};
        mockMetricQuery = {};
        mockLogService = {
            logError: jest.fn(),
        };
        mockLangliveUserSettingConsumer = {
            updateLeaderboardSettings: jest.fn(),
        };
        mockApp = {
            post: jest.fn(),
        };
        mockPublisher = {
            publishToUser: jest.fn(),
        };
        router = new HttpRouter(
            mockAppConfigs,
            mockGameData,
            mockHistoryQuery,
            mockMetricQuery,
            mockLogService,
            mockLangliveUserSettingConsumer,
            mockPublisher
        );
    });

    describe("constructor", () => {
        it("should initialize with all required dependencies", () => {
            // Assert
            expect(router.langliveUserSettingConsumer).toBe(mockLangliveUserSettingConsumer);
        });

        it("should call parent constructor with correct parameters", () => {
            // Assert
            expect(router.appConfigs).toBe(mockAppConfigs);
            expect(router.gameData).toBe(mockGameData);
            expect(router.historyQuery).toBe(mockHistoryQuery);
            expect(router.metricQuery).toBe(mockMetricQuery);
            expect(router.logService).toBe(mockLogService);
        });
    });

    describe("init", () => {
        beforeEach(() => {
            Table.Routers.TableHttpRouter.prototype.init = jest.fn();
        });
        it("should call parent init method", () => {
            // Act
            router.init(mockApp);

            // Assert
            expect(Table.Routers.TableHttpRouter.prototype.init).toHaveBeenCalledWith(mockApp);
        });

        it("should register /api/set-result endpoint", () => {
            // Act
            router.init(mockApp);

            // Assert
            expect(mockApp.post).toHaveBeenCalledWith("/api/set-result", expect.any(Function));
        });

        it("should register /api/update-leaderboard-settings endpoint", () => {
            // Act
            router.init(mockApp);

            // Assert
            expect(mockApp.post).toHaveBeenCalledWith("/api/update-leaderboard-settings", expect.any(Function));
        });

        it("should register /api/void-ticket endpoint", () => {
            // Act
            router.init(mockApp);

            // Assert
            expect(mockApp.post).toHaveBeenCalledWith("/api/void-ticket", expect.any(Function), expect.any(Function));
        });
    });

    describe("handleSetResult", () => {
        let mockReq: any;
        let mockRes: any;

        beforeEach(() => {
            mockReq = {
                body: {
                    result: 15,
                    playerName: "test-player",
                },
            };
            mockRes = {
                sendStatus: jest.fn(),
                send: jest.fn(),
            };
        });

        it("should return 404 when disableSetResult is true", async () => {
            // Arrange
            mockAppConfigs.disableSetResult = true;
            const handler = router.handleSetResult();

            // Act
            await handler(mockReq, mockRes);

            // Assert
            expect(mockRes.sendStatus).toHaveBeenCalledWith(404);
            expect(mockRes.send).not.toHaveBeenCalled();
        });

        it("should return 404 when environment is PROD", async () => {
            // Arrange
            mockAppConfigs.sentry.env = "PROD";
            const handler = router.handleSetResult();

            // Act
            await handler(mockReq, mockRes);

            // Assert
            expect(mockRes.sendStatus).toHaveBeenCalledWith(404);
            expect(mockRes.send).not.toHaveBeenCalled();
        });

        it("should set settlement result and send true when conditions are met", async () => {
            // Arrange
            const handler = router.handleSetResult();

            // Act
            await handler(mockReq, mockRes);

            // Assert
            expect(mockGameData.settlementResultFromAdmin).toEqual({
                playerName: "test-player",
                result: 15,
            });
            expect(mockLogService.logError).toHaveBeenCalledWith('Set result from admin: {"playerName":"test-player","result":15}');
            expect(mockRes.send).toHaveBeenCalledWith(true);
        });
    });

    describe("handleUpdateLeaderboardSettings", () => {
        let mockReq: any;
        let mockRes: any;
        let mockUserSession: any;

        beforeEach(() => {
            mockReq = {
                body: {
                    hideAvatar: true,
                    hideName: false,
                },
            };
            mockRes = {
                send: jest.fn(),
            };
            mockUserSession = {
                userId: "test-user-id",
            };
        });

        it("should update leaderboard settings and return success when both parameters are provided", async () => {
            // Act
            await router.handleUpdateLeaderboardSettings(mockReq, mockRes, mockUserSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).toHaveBeenCalledWith("test-user-id", {
                hideAvatar: true,
                hideName: false,
            });
            expect(mockRes.send).toHaveBeenCalledWith({ success: true });
        });

        it("should return success false when hideAvatar is undefined", async () => {
            // Arrange
            mockReq.body = { hideName: false };

            // Act
            await router.handleUpdateLeaderboardSettings(mockReq, mockRes, mockUserSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).not.toHaveBeenCalled();
            expect(mockRes.send).toHaveBeenCalledWith({ success: false });
        });

        it("should return success false when hideName is undefined", async () => {
            // Arrange
            mockReq.body = { hideAvatar: true };

            // Act
            await router.handleUpdateLeaderboardSettings(mockReq, mockRes, mockUserSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).not.toHaveBeenCalled();
            expect(mockRes.send).toHaveBeenCalledWith({ success: false });
        });

        it("should handle boolean false values correctly", async () => {
            // Arrange
            mockReq.body = { hideAvatar: false, hideName: false };

            // Act
            await router.handleUpdateLeaderboardSettings(mockReq, mockRes, mockUserSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateLeaderboardSettings).toHaveBeenCalledWith("test-user-id", {
                hideAvatar: false,
                hideName: false,
            });
            expect(mockRes.send).toHaveBeenCalledWith({ success: true });
        });

        it("should handle error and return error response", async () => {
            // Arrange
            const error = new Error("Test error");
            mockLangliveUserSettingConsumer.updateLeaderboardSettings.mockImplementation(() => {
                throw error;
            });

            // Act
            await router.handleUpdateLeaderboardSettings(mockReq, mockRes, mockUserSession);

            // Assert
            expect(mockLogService.logError).toHaveBeenCalledWith(error);
            expect(mockRes.send).toHaveBeenCalledWith({ error: true });
        });
    });

    describe("handleVoidTicket", () => {
        let mockReq: any;
        let mockRes: any;
        beforeEach(() => {
            mockReq = {
                body: {
                    Name: "playerName",
                    UserIdentify: "111",
                    RoundId: 123,
                },
            };
            mockRes = {
                send: jest.fn(),
            };
        });
        describe("when invalid request", () => {
            it("should send false when Name is missing", async () => {
                // Arrange
                mockReq.body.Name = "";

                // Act
                await router.handleVoidTicket(mockReq, mockRes);

                // Assert
                expect(mockRes.send).toHaveBeenCalledWith(false);
                expect(mockLogService.logError).toHaveBeenCalledWith("Void ticket request is missing required parameters");
            });

            it("should send false when RoundId is 0", async () => {
                // Arrange
                mockReq.body.RoundId = 0;

                // Act
                await router.handleVoidTicket(mockReq, mockRes);

                // Assert
                expect(mockRes.send).toHaveBeenCalledWith(false);
                expect(mockLogService.logError).toHaveBeenCalledWith("Void ticket request is missing required parameters");
            });
        });

        describe("when running round", () => {
            it("should delete player bet and send true", async () => {
                // Arrange
                mockGameData.ingame["playerName"] = { roundId: 123 };

                // Act
                await router.handleVoidTicket(mockReq, mockRes);

                // Assert
                expect(mockGameData.ingame["playerName"]).toBeUndefined();
                expect(mockLogService.logError).toHaveBeenCalledWith('Void running ticket from api call for "playerName"');
                expect(mockPublisher.publishToUser).toHaveBeenCalledWith("111", { toLobby: true });
                expect(mockRes.send).toHaveBeenCalledWith(true);
            });
        });
        it("should not delete player bet and send true", async () => {
            // Arrange
            mockGameData.playerBetHistory["111"] = [{ roundId: 123 }, { roundId: 122 }];

            // Act
            await router.handleVoidTicket(mockReq, mockRes);

            // Assert
            expect(mockGameData.playerBetHistory["111"]).toEqual([{ roundId: 122 }]);
            expect(mockRes.send).toHaveBeenCalledWith(true);
        });
    });
});
