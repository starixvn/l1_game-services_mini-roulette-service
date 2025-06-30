import { BaseEventPublishers, Crons } from "sc-game-base/src/core";
import RouletteSettleGameRoundConsumer from "../consumers/roulette-settle-game-round-consumer";
import RouletteGameDefinition from "../roulette-game-definition";
import { RouletteGameData } from "../roulette-game-data";
import mongoose from "mongoose";
import { logger } from "sc-common";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import BaseMetrics from "sc-game-base/src/core/base-metrics";
import { buildBetAmountIncrement } from "../helpers/choice-helper";
import { RouletteBet, RouletteBetLog } from "../types";

export default class RouletteProcessBetQueue extends Crons.ProcessBetQueue {
    settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    constructor(props: {
        definition: RouletteGameDefinition;
        gameData: RouletteGameData;
        placeBetPublisher: BaseEventPublishers.PlaceBetPublisher;
        placeBet: any;
        logService: typeof logger;
        betsRepository: mongoose.Model<any>;
        betLogsRepository: mongoose.Model<any>;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        baseMetrics: BaseMetrics;
        settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    }) {
        super(props);
        this.settleGameRoundConsumer = props.settleGameRoundConsumer;
    }
    async proceedBet(player: any, payload: any) {
        payload.roundId = this.gameData.roundId;
        this.gameData.roundId++;
        await super.proceedBet(player, payload);
        this.resetPlayerBetTracks(player.profile.name);
    }

    async handleSuccessBet(player: any, balance: any, roundId: number, bet: any) {
        await super.handleSuccessBet(player, balance, roundId, bet);
        await this.settleGameRoundConsumer.settleRoundById(roundId);
    }

    resetPlayerBetTracks(playerName: string) {
        delete this.gameData.ingame[playerName];
    }

    async validateBetRequest(player: any, payload: any) {
        return true;
    }

    async upsertBet(player: any, roundId: number, bet: any, rate: number) {
        const configs = this.gameData.gameConfigs;
        const newBet: RouletteBet = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            odds: configs.odds,
            freeBet: bet.freeBet,
            roundId,
            clientSeed: bet.clientSeed,
        };
        const existingBetFilter = { uid: player.UID, roundId, freeBet: bet.freeBet };
        const existingBetIncrement = { ...buildBetAmountIncrement(bet.betChoices), totalAmount: bet.amount };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;
            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
        }

        await this.betsRepository.updateOne(
            existingBetFilter,
            { $inc: existingBetIncrement, $setOnInsert: newBet },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    async insertBetLog(player: any, roundId: number, bet: any, rate: number) {
        const newBetLog: RouletteBetLog = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            freeBet: bet.freeBet,
            ...bet.betChoices,
            roundId,
            clientSentTime: bet.clientSentTime,
            receivedTime: bet.receivedTime,
        };

        if (player.session) {
            newBetLog.siteId = player.session.siteId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;
            newBetLog.operatorId = player.session.operatorId;
            newBetLog.playerId = player.session.playerId;
        }

        await this.betLogsRepository.create(newBetLog);
    }

    formatApiBetInfo(payload: any) {
        return {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: payload.roundId,
            freeBet: payload.freeBet,
        };
    }

    adjustTotalBets(player: any, bet: any, rate: number) {
        // nothing
    }

    adjustOwnBets(playerName: string, bet: any) {
        // nothing
    }

    decreaseBetTracks(playerName: string, bet: any) {
        // nothing
    }
}
