import { ProcessBetQueue } from "sc-game-base/src/core/crons";
import { trackBetChoices, buildBetAmountIncrement } from "../helpers/choice-helper";

export default class RouletteProcessBetQueue extends ProcessBetQueue {
    constructor({
        definition,
        gameData,
        placeBetPublisher,
        placeBet,
        logService,
        betsRepository,
        betLogsRepository,
        userInfosRepository,
        baseMetrics,
        settleGameRoundConsumer,
    }) {
        super({
            definition,
            gameData,
            placeBetPublisher,
            placeBet,
            logService,
            betsRepository,
            betLogsRepository,
            userInfosRepository,
            baseMetrics,
        });
        this.settleGameRoundConsumer = settleGameRoundConsumer;
    }
    async proceedBet(player, payload) {
        payload.roundId = this.gameData.roundId;
        this.gameData.roundId++;
        await super.proceedBet(player, payload);
        this.resetPlayerBetTracks(player.profile.name);
    }

    async handleSuccessBet(player, balance, roundId, bet) {
        await super.handleSuccessBet(player, balance, roundId, bet);
        await this.settleGameRoundConsumer.settleRound(roundId);
    }

    resetPlayerBetTracks(playerName) {
        delete this.gameData.ingame[playerName];
    }

    async validateBetRequest(player, payload) {
        return true;
    }

    async upsertBet(player, roundId, bet, rate) {
        const configs = this.gameData.gameConfigs;
        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            odds: configs.odds,
            freeBet: bet.freeBet,
            roundId,
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

    async insertBetLog(player, roundId, bet, rate) {
        const newBetLog = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            freeBet: bet.freeBet,
            ...bet.betChoices,
            roundId,
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

    adjustTotalBets(player, bet, rate) {
        // nothing
    }

    adjustOwnBets(playerName, bet) {
        // nothing
    }

    decreaseBetTracks(playerName, bet) {
        // nothing
    }

    formatApiBetInfo(payload) {
        return {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: payload.roundId,
            freeBet: payload.freeBet,
        };
    }
}
