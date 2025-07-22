import appConfigs from "./app-configs";
import gameSettings from "./game-settings";
import { startTrace } from "sc-instrument";

startTrace(
    (appConfigs as any).otel?.enabled,
    (appConfigs as any).otel?.endpoint,
    (appConfigs as any).otel?.system,
    appConfigs.sentry.env,
    gameSettings.name
);

import { ResultHelper, ResultControlHelper } from "./helpers";
import RouletteContainerRegistry from "./roulette-container-registry";
import { RouletteGameData } from "./roulette-game-data";
import RouletteGameDefinition from "./roulette-game-definition";
import RouletteGameApp from "./roulette-game-app";

const run = async () => {
    const definition = new RouletteGameDefinition(
        gameSettings as any,
        ResultHelper.generateResult,
        ResultHelper.getSettlementResult,
        () => {},
        ResultControlHelper.controlResultByBet
    );
    const gameData = new RouletteGameData(gameSettings.durations.wholeRound);
    const container = new RouletteContainerRegistry().register(appConfigs, definition, gameData);
    const app = new RouletteGameApp(gameSettings.name, appConfigs);

    await app.run();
    await app.startGame(container);
};

run();
