import { initAPIStub, stubUserService, subGameManagementService } from "sc-game-service-integration-utils";
import appConfigs from "../../../build/app-configs.IGT";
import gameSettings from "../_stubs/game-settings";
import RouletteGameDefinition from "../../../build/roulette-game-definition";
import { ResultHelper, ResultControlHelper } from "../../../build/helpers";
import { RouletteGameData } from "../../../build/roulette-game-data";
import RouletteContainerRegistry from "../../../build/roulette-container-registry";
import RouletteGameApp from "../../../build/roulette-game-app";

export const run = async () => {
    initAPIStub(appConfigs.apiSettings.apiUrl);
    const definition = new RouletteGameDefinition(
        gameSettings,
        ResultHelper.generateResult,
        ResultHelper.getSettlementResult,
        () => {},
        ResultControlHelper.controlResultByBet
    );
    const gameData = new RouletteGameData(gameSettings.durations.wholeRound);
    stubUserService(appConfigs);
    subGameManagementService(appConfigs, definition);
    const container = new RouletteContainerRegistry().register(appConfigs, definition, gameData);
    const app = new RouletteGameApp(gameSettings.name, appConfigs);
    await app.run();
    await app.startGame(container);
};

run();
