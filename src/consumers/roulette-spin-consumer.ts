import { helpers } from "sc-common";
import RouletteSettleGameRoundConsumer from "./roulette-settle-game-round-consumer";
import { RouletteGameData } from "../roulette-game-data";
import notices from "../constants/notices";
import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";

export default class RouletteSpinConsumer {
    gameData: RouletteGameData;
    settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    publisher: BaseEventPublisher;
    constructor({
        gameData,
        settleGameRoundConsumer,
        publisher,
    }: {
        gameData: RouletteGameData;
        settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
        publisher: BaseEventPublisher;
    }) {
        this.gameData = gameData;
        this.settleGameRoundConsumer = settleGameRoundConsumer;
        this.publisher = publisher;
    }

    validateRequest(player: any) {
        const playerName = player.profile.name;
        const playerData = this.gameData.ingame?.[playerName];
        if (!playerData) {
            return this.verifyCriteria(
                [
                    {
                        failure: !playerData,
                        errorCode: helpers.noticeHelper.invalidBet,
                    },
                ],
                player
            );
        }
        const { betQueue, betTracks, betProcessing } = this.gameData.ingame?.[playerName] || {
            betTracks: {},
            betProcessing: true,
            betQueue: [],
        };
        const criteria = [
            { failure: betProcessing, errorCode: notices.processingAction },
            { failure: betQueue.length > 0, errorCode: notices.processingAction },
            { failure: Object.keys(betTracks).length === 0, errorCode: helpers.noticeHelper.invalidBet },
        ];
        return this.verifyCriteria(criteria, player);
    }

    verifyCriteria(criteria: { failure: boolean; errorCode: string }[], player: any) {
        const failedCriterion = criteria.find((criterion) => criterion.failure);

        if (failedCriterion) {
            const { errorCode } = failedCriterion;
            this.publisher.publishToUser(player.UID, { endBet: -1, notice: { errorCode } });
        }

        return failedCriterion === undefined;
    }

    consume(player: any) {
        if (!this.validateRequest(player)) {
            return;
        }
        const playerName = player.profile.name;
        const playerData = this.gameData.ingame?.[playerName];
        playerData.roundId > 0 && this.settleGameRoundConsumer.settleRoundById(playerData.roundId);
    }
}
