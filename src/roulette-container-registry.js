import awilix from "awilix";
import { Table } from "sc-game-base";

import { PlaceBetConsumer, SettleGameRoundConsumer } from "./consumers";
import { RouletteBot, RouletteGameCron, RouletteProcessBetQueue } from "./crons";
import { RouletteBets, RouletteRounds, RouletteTmpBets, RouletteBetLogs } from "./models";
import RouletteHistoryQuery from "./query-apis/roulette-history-query";

const { asClass, asValue } = awilix;

export default class RouletteContainerRegistry extends Table.TableContainerRegistry {
    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(RouletteRounds),
            betsRepository: asValue(RouletteBets),
            tempBetsRepository: asValue(RouletteTmpBets),
            betLogsRepository: asValue(RouletteBetLogs),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asClass(RouletteBot).singleton(),
            gameCron: asClass(RouletteGameCron).singleton().proxy(),
            processBetQueue: asClass(RouletteProcessBetQueue).singleton().proxy(),
        });
    }

    registerApis() {
        super.registerApis();

        this.container.register({
            historyQuery: asClass(RouletteHistoryQuery).singleton(),
        });
    }
}
