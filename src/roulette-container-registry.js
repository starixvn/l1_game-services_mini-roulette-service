import awilix from "awilix";
import { Table } from "sc-game-base";

import { PlaceBetConsumer, SettleGameRoundConsumer, RoundResultConsumer } from "./consumers";
import { RouletteGameCron, RouletteProcessBetQueue } from "./crons";
import { RouletteBets, RouletteRounds, RouletteBetLogs } from "./models";
import HttpRouter from "./routers/http-router";
import { RouletteBetQuery, RouletteHistoryQuery } from "./query-apis";
const { asClass, asValue } = awilix;

export default class RouletteContainerRegistry extends Table.TableContainerRegistry {
    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(RouletteRounds),
            betsRepository: asValue(RouletteBets),
            betLogsRepository: asValue(RouletteBetLogs),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            roundResultConsumer: asClass(RoundResultConsumer).singleton().proxy(),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asValue(undefined),
            gameCron: asClass(RouletteGameCron).singleton().proxy(),
            processBetQueue: asClass(RouletteProcessBetQueue).singleton().proxy(),
        });
    }

    registerApis() {
        super.registerApis();

        this.container.register({
            historyQuery: asClass(RouletteHistoryQuery).singleton(),
            betQuery: asClass(RouletteBetQuery).singleton(),
        });
    }

    registerRouters() {
        super.registerRouters();

        this.container.register({
            httpRouter: asClass(HttpRouter),
        });
    }
}
