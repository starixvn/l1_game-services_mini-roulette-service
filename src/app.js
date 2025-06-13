import appConfigs from "./app-configs";
import gameSettings from "./game-settings";
import { startTrace } from "sc-instrument";

startTrace(appConfigs.otel?.enabled, appConfigs.otel?.endpoint, appConfigs.otel?.system, appConfigs.sentry.env, gameSettings.name);

import { Core } from "sc-game-base";

import { generateResult, getSettlementResult } from "./helpers/result-helper";
import { controlResultByBet } from "./helpers/result-control-helper";
import RouletteContainerRegistry from "./roulette-container-registry";
import { RouletteGameData } from "./roulette-game-data";
import RouletteGameDefinition from "./roulette-game-definition";

const run = async () => {
    const definition = new RouletteGameDefinition(gameSettings, generateResult, getSettlementResult, null, controlResultByBet);
    const gameData = new RouletteGameData(gameSettings.durations.wholeRound);
    const container = new RouletteContainerRegistry().register(appConfigs, definition, gameData);
    const app = new Core.BaseGameApp(gameSettings.name, appConfigs);

    await app.run();
    await app.startGame(container);
};

run();
