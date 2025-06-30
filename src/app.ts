import appConfigs from "./app-configs";
import gameSettings from "./game-settings";
import { startTrace } from "sc-instrument";

startTrace(
    (appConfigs as any).otel?.enabled,
    (appConfigs as any).otel?.endpoint,
    (appConfigs as any).otel?.system,
    (appConfigs as any).sentry.env,
    gameSettings.name
);

import { Core } from "sc-game-base";
import { controlResultByBet } from "./helpers/control-result-helper";
import { generateResult, getSettlementResult } from "./helpers/result-helper";
import RouletteContainerRegistry from "./roulette-container-registry";
import RouletteGameDefinition from "./roulette-game-definition";
import { RouletteGameData } from "./roulette-game-data";

const run = async () => {
    const definition = new RouletteGameDefinition(gameSettings as any, generateResult, getSettlementResult, () => {}, controlResultByBet);
    const gameData = new RouletteGameData(gameSettings.durations.wholeRound);
    const container = new RouletteContainerRegistry().register(appConfigs, definition, gameData);
    const app = new Core.BaseGameApp(gameSettings.name, appConfigs);

    await app.run();
    await app.startGame(container);
};

run();
