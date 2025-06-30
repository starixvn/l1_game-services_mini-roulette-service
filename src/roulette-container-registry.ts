import { asClass, asValue } from "awilix";
import { Table, Core } from "sc-game-base";

import { PlaceBetConsumer, SettleGameRoundConsumer, RoundResultConsumer, InGameConsumer } from "./consumers";
import { RouletteGameCron, RouletteProcessBetQueue } from "./crons";
import { RouletteBets, RouletteRounds, RouletteBetLogs } from "./models";
import HttpRouter from "./routers/http-router";
import { RouletteBetQuery, RouletteHistoryQuery, RouletteRoundQuery } from "./query-apis";

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
            inGameConsumer: asClass(InGameConsumer).singleton(),
            userDisconnectConsumer: asClass(Core.BaseEventConsumers.UserDisconnectConsumer).singleton(),
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
            roundQuery: asClass(RouletteRoundQuery).singleton(),
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
