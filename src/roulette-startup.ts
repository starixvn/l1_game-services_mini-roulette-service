import BaseGameStartup from "sc-game-base/src/core/base-game-startup";
import { Server } from "socket.io";
import { logger } from "sc-common";
import express from "express";
import { RouletteLeaderboardAccumulator } from "./crons";

export default class RouletteStartup extends BaseGameStartup {
    leaderboardAccumulator: RouletteLeaderboardAccumulator;
    constructor(container: any) {
        super(container);
        this.leaderboardAccumulator = this.container.resolve("leaderboardAccumulator");
    }

    async start(app: express.Express, socketServer: Server) {
        const gameNameInSocketNamespace = this.definition.name.toLowerCase();
        this.initHttpRouter(app);

        socketServer.of(`/user/${gameNameInSocketNamespace}`).on("connection", (socketClient) => {
            this.initSocketRouter(socketClient);
        });

        socketServer.of(`/admin/${gameNameInSocketNamespace}`).on("connection", (socketClient) => {
            this.initAdminSocketRouter(socketClient);
        });

        try {
            await this.gameCron.start();
            this.processBetQueue.start();
            this.leaderboardAccumulator.start();
        } catch (error) {
            logger.logError(error);
        }
    }
}
