import RouletteStartup from "../../src/roulette-startup";
import express from "express";
import { Server } from "socket.io";
import { logger } from "sc-common";

// Mock dependencies
jest.mock("sc-game-base/src/core/base-game-startup", () => {
    return class BaseGameStartup {
        container: any;
        definition: any;
        gameCron: any;
        processBetQueue: any;

        constructor(container: any) {
            this.container = container;
            this.definition = container.definition;
            this.gameCron = container.gameCron;
            this.processBetQueue = container.processBetQueue;
        }

        initHttpRouter() {}
        initSocketRouter() {}
        initAdminSocketRouter() {}
    };
});

jest.mock("sc-common", () => ({
    logger: {
        logError: jest.fn(),
    },
}));

jest.mock("../../src/crons", () => ({
    RouletteLeaderboardAccumulator: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
    })),
}));

describe("RouletteStartup", () => {
    let startup: RouletteStartup;
    let mockContainer: any;
    let mockApp: express.Express;
    let mockSocketServer: Server;
    let mockLeaderboardAccumulator: any;
    let mockGameCron: any;
    let mockProcessBetQueue: any;
    let mockDefinition: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDefinition = {
            name: "MiniRoulette",
        };

        mockGameCron = {
            start: jest.fn(),
        };

        mockProcessBetQueue = {
            start: jest.fn(),
        };

        mockLeaderboardAccumulator = {
            start: jest.fn(),
        };

        mockContainer = {
            definition: mockDefinition,
            gameCron: mockGameCron,
            processBetQueue: mockProcessBetQueue,
            resolve: jest.fn().mockReturnValue(mockLeaderboardAccumulator),
        };

        mockApp = {
            use: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
        } as any;

        mockSocketServer = {
            of: jest.fn().mockReturnValue({
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === "connection") {
                        // Simulate socket connection
                        const mockSocket = {
                            on: jest.fn(),
                            emit: jest.fn(),
                        };
                        callback(mockSocket);
                    }
                }),
            }),
        } as any;

        startup = new RouletteStartup(mockContainer);
    });

    describe("start", () => {
        it("should initialize HTTP router and socket connections successfully", async () => {
            // Arrange
            const mockInitHttpRouter = jest.fn();
            const mockInitSocketRouter = jest.fn();
            const mockInitAdminSocketRouter = jest.fn();

            startup.initHttpRouter = mockInitHttpRouter;
            startup.initSocketRouter = mockInitSocketRouter;
            startup.initAdminSocketRouter = mockInitAdminSocketRouter;

            // Act
            await startup.start(mockApp, mockSocketServer);

            // Assert
            expect(mockInitHttpRouter).toHaveBeenCalledWith(mockApp);
            expect(mockSocketServer.of).toHaveBeenCalledWith("/user/miniroulette");
            expect(mockSocketServer.of).toHaveBeenCalledWith("/admin/miniroulette");
            expect(mockGameCron.start).toHaveBeenCalled();
            expect(mockProcessBetQueue.start).toHaveBeenCalled();
            expect(mockLeaderboardAccumulator.start).toHaveBeenCalled();
        });

        it("should handle socket connections for user namespace", async () => {
            // Arrange
            const mockSocket = {
                on: jest.fn(),
                emit: jest.fn(),
            };
            const mockInitSocketRouter = jest.fn();
            startup.initSocketRouter = mockInitSocketRouter;

            const mockOf = jest.fn().mockReturnValue({
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === "connection") {
                        callback(mockSocket);
                    }
                }),
            });
            mockSocketServer.of = mockOf;

            // Act
            await startup.start(mockApp, mockSocketServer);

            // Assert
            expect(mockOf).toHaveBeenCalledWith("/user/miniroulette");
            expect(mockInitSocketRouter).toHaveBeenCalledWith(mockSocket);
        });

        it("should handle socket connections for admin namespace", async () => {
            // Arrange
            const mockSocket = {
                on: jest.fn(),
                emit: jest.fn(),
            };
            const mockInitAdminSocketRouter = jest.fn();
            startup.initAdminSocketRouter = mockInitAdminSocketRouter;

            const mockOf = jest.fn().mockReturnValue({
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === "connection") {
                        callback(mockSocket);
                    }
                }),
            });
            mockSocketServer.of = mockOf;

            // Act
            await startup.start(mockApp, mockSocketServer);

            // Assert
            expect(mockOf).toHaveBeenCalledWith("/admin/miniroulette");
            expect(mockInitAdminSocketRouter).toHaveBeenCalledWith(mockSocket);
        });

        it("should handle error", async () => {
            // Arrange
            const mockError = new Error("Cron startup failed");
            mockGameCron.start.mockRejectedValue(mockError);

            // Act
            await startup.start(mockApp, mockSocketServer);

            // Assert
            expect(logger.logError).toHaveBeenCalledWith(mockError);
        });
    });
});
