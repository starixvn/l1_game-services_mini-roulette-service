import BaseGameApp from "sc-game-base/src/core/base-game-app";
import * as awilix from "awilix";
import RouletteStartup from "./roulette-startup";

export default class RouletteGameApp extends BaseGameApp {
    async startGame(container: any) {
        container.register({ baseMetrics: awilix.asValue(this.baseMetrics) });
        const gameStartUp = new RouletteStartup(container);
        await gameStartUp.start(this.app, this.socketServer);
    }
}
