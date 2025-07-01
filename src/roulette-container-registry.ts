import { asClass, asValue } from "awilix";
import { Table } from "sc-game-base";
import { InGameConsumer, PlaceBetConsumer, RoundResultConsumer, SettleGameRoundConsumer, UnsettledRoundConsumer } from "./consumers";
import { RouletteBot, RouletteGameCron, RouletteProcessBetQueue } from "./crons";
import { RouletteBets, RouletteRounds, RouletteTmpBets, RouletteBetLogs, RoulettePlayerRoundModel } from "./models";
import { RouletteHistoryQuery, RouletteBetQuery, RouletteRoundQuery } from "./query-apis";

export default class RouletteContainerRegistry extends Table.TableContainerRegistry {
    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(RouletteRounds),
            betsRepository: asValue(RouletteBets),
            tempBetsRepository: asValue(RouletteTmpBets),
            betLogsRepository: asValue(RouletteBetLogs),
            playerRoundRepository: asValue(RoulettePlayerRoundModel),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            inGameConsumer: asClass(InGameConsumer).singleton(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            roundResultConsumer: asClass(RoundResultConsumer).singleton().proxy(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            unsettledRoundConsumer: asClass(UnsettledRoundConsumer).singleton().proxy(),
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
            betQuery: asClass(RouletteBetQuery).singleton(),
            roundQuery: asClass(RouletteRoundQuery).singleton(),
        });
    }
}
