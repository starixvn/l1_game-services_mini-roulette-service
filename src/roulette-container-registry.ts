import { asClass, asValue } from "awilix";
import { Table, Core } from "sc-game-base";

import {
    PlaceBetConsumer,
    SettleGameRoundConsumer,
    RoundResultConsumer,
    InGameConsumer,
    ActionSettleConsumer,
    GuaranteedFeatureConsumer,
    OutGameConsumer,
    RouletteLeaderboardConsumer,
    LangliveUserSettingConsumer,
    RouletteUserSigninConsumer,
    RebetConsumer,
} from "./consumers";
import { RouletteGameCron, RouletteLeaderboardAccumulator, RouletteProcessBetQueue } from "./crons";
import { RouletteBets, RouletteRounds, RouletteBetLogs } from "./models";
import { HttpRouter, SocketRouter } from "./routers";
import { RouletteBetQuery, RouletteHistoryQuery, RouletteRoundQuery } from "./query-apis";

export default class RouletteContainerRegistry extends Table.TableContainerRegistry {
    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            inGameConsumer: asClass(InGameConsumer).singleton(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            userDisconnectConsumer: asClass(OutGameConsumer).singleton(),
            roundResultConsumer: asClass(RoundResultConsumer).singleton().proxy(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            actionSettleConsumer: asClass(ActionSettleConsumer).singleton().proxy(),
            guaranteedFeatureConsumer: asClass(GuaranteedFeatureConsumer).singleton().proxy(),
            leaderboardConsumer: asClass(RouletteLeaderboardConsumer).singleton().proxy(),
            langliveUserSettingConsumer: asClass(LangliveUserSettingConsumer).singleton().proxy(),
            userSigninConsumer: asClass(RouletteUserSigninConsumer).singleton(),
            rebetConsumer: asClass(RebetConsumer).singleton().proxy(),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asValue(undefined),
            gameCron: asClass(RouletteGameCron).singleton().proxy(),
            processBetQueue: asClass(RouletteProcessBetQueue).singleton().proxy(),
            leaderboardAccumulator: asClass(RouletteLeaderboardAccumulator).singleton().proxy(),
        });
    }

    registerPublishers() {
        super.registerPublishers();

        this.container.register({
            placeBetPublisher: asClass(Core.BaseEventPublishers.PlaceBetPublisher).singleton(),
        });
    }

    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(RouletteRounds),
            betsRepository: asValue(RouletteBets),
            betLogsRepository: asValue(RouletteBetLogs),
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
            socketRouter: asClass(SocketRouter).proxy(),
            httpRouter: asClass(HttpRouter),
        });
    }
}
