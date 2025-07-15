import { Crons } from "sc-game-base/src/core";
import { trackBetChoices, buildBetAmountIncrement } from "../helpers/choice-helper";
import { RouletteBet, RouletteBetLog } from "../types";
import { RouletteGameData } from "../roulette-game-data";
import Constants from "../constants";
import RouletteSettleGameRoundConsumer from "../consumers/roulette-settle-game-round-consumer";
import { helpers } from "sc-common";
import notices from "../constants/notices";

export default class RouletteProcessBetQueue extends Crons.ProcessBetQueue {
    declare gameData: RouletteGameData;
    declare settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    constructor(props: any) {
        super(props);
        this.settleGameRoundConsumer = props.settleGameRoundConsumer;
    }

    async proceedBet(player: any, payload: any) {
        const { action } = payload;
        switch (action) {
            case Constants.actions.bet:
                await this.proceedActionBet(player, payload);
                break;
            case Constants.actions.settle:
                await this.proceedActionSettle(player, payload);
                break;
            default:
                break;
        }
    }

    private async proceedActionBet(player: any, payload: any) {
        if (this.gameData.ingame?.[player.profile.name]?.roundId === 0) {
            this.gameData.ingame[player.profile.name].roundId = this.gameData.roundId;
            this.gameData.roundId++;
        }
        payload.roundId = this.gameData.ingame?.[player.profile.name]?.roundId ?? this.gameData.roundId;
        await super.proceedBet(player, payload);
    }

    private async proceedActionSettle(player: any, payload: any) {
        if (!(await this.validateSettleRequest(player))) {
            return;
        }
        this.gameData.ingame[player.profile.name].settleProcessing = true;
        const roundId = this.gameData.ingame[player.profile.name].roundId;
        await this.settleGameRoundConsumer.settleRoundById(roundId, player.profile.name);
    }

    async composeValidationCriteria(player: any, payload: any) {
        const playerData = this.gameData.ingame?.[player.profile.name];
        return [
            {
                failure: playerData?.settleProcessing,
                notice: { errorCode: helpers.noticeHelper.cannotPlaceBet },
            },
        ];
    }

    async validateSettleRequest(player: any) {
        const criteria = this.composeSettleValidationCriteria(player);
        const failedCriterion = criteria.find((criterion) => criterion.failure);
        if (failedCriterion) {
            this.placeBetPublisher.publishGameFailedBet(player.UID, { endBet: -1, notice: failedCriterion.notice });
            return false;
        }
        return true;
    }

    composeSettleValidationCriteria(player: any) {
        const playerData = this.gameData.ingame?.[player.profile.name];
        const { betQueue, betTracks, roundId, settleProcessing } = playerData || {
            betTracks: {},
            betQueue: [],
            roundId: 0,
            settleProcessing: false,
        };
        const total = Object.values(betTracks as Record<string, Record<string, number>>).reduce((acc, curr) => {
            return Object.values(curr).reduce((acc, curr) => acc + curr, acc);
        }, 0);
        const criteria = [
            { failure: !playerData, errorCode: helpers.noticeHelper.invalidBet },
            { failure: betQueue.length > 0, errorCode: notices.processingAction },
            { failure: total === 0, errorCode: helpers.noticeHelper.invalidBet },
            { failure: !roundId || roundId <= 0, errorCode: helpers.noticeHelper.invalidBet },
            { failure: settleProcessing, errorCode: notices.processingAction },
        ];
        return criteria.map((criterion) => ({
            failure: criterion.failure,
            notice: { errorCode: criterion.errorCode, action: Constants.actions.settle },
        }));
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
        };
        const existingBetFilter = { uid: player.UID, roundId, freeBet: bet.freeBet };
        const existingBetIncrement = { ...buildBetAmountIncrement(bet.betChoices), totalAmount: bet.amount };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;
            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
            newBet.currencyGroupId = player.session.currencyGroupId;
            newBet.guaranteedFeature = this.gameData.guaranteedFeature[player.session.currencyGroupId];
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
            newBetLog.currencyGroupId = player.session.currencyGroupId;
        }

        await this.betLogsRepository.create(newBetLog);
    }

    formatApiBetInfo(payload: any) {
        return {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: payload.roundId,
            freeBet: payload.freeBet,
            choiceId: this.getFirstBetChoiceId(payload.betChoices),
            clientSentTime: payload.clientSentTime ?? payload.time ?? new Date(),
        };
    }

    private getFirstBetChoiceId(betChoices: Record<string, Record<string, number>>): number {
        const firstBetType = Object.keys(betChoices)[0];
        const firstChoice = Object.keys(betChoices[firstBetType])[0];

        return (this.definition.choicesMapper as Record<string, Record<string, number>>)?.[firstBetType]?.[firstChoice] ?? 0;
    }

    generatePlacingBetResult(player: any, balance: any, payload: any, rate: number): any {
        const { amount, betChoices, roundId } = payload;
        const ownBet = super.generatePlacingBetResult(player, balance, payload, rate) as any;
        ownBet.ownChip = { betChoices, amount };
        ownBet.roundId = roundId;
        return ownBet;
    }

    adjustTotalBets(player: any, bet: any, rate: number) {
        // nothing
    }

    decreaseBetTracks(playerName: string, bet: any) {
        bet && this.adjustBetTracks(playerName, bet, true);
    }

    adjustBetTracks = (playerName: string, bet: any, reduce = false) => {
        if (this.gameData.ingame?.[playerName]) {
            const { betTracks } = this.gameData.ingame[playerName];

            betTracks && trackBetChoices(betTracks, bet.betChoices, 1, reduce);
        }
    };

    adjustOwnBets(playerName: string, bet: any) {
        if (this.gameData.ingame?.[playerName]) {
            const playerInGame = this.gameData.ingame[playerName];

            playerInGame.ownBets = playerInGame.ownBets ?? {};

            trackBetChoices(playerInGame.ownBets, bet.betChoices, 1);
        }
    }
}
