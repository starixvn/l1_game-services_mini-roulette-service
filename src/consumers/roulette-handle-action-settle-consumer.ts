import { helpers } from "sc-common";
import RouletteSettleGameRoundConsumer from "./roulette-settle-game-round-consumer";
import { RouletteGameData } from "../roulette-game-data";
import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";
import Constants from "../constants";

export default class RouletteHandleActionSettleConsumer {
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

    composeRequestValidationCriteria(player: any) {
        const playerData = this.gameData.ingame[player.profile.name];
        const { betQueue, settleProcessing } = playerData || { betQueue: [], settleProcessing: false };
        return [
            {
                failure: !playerData,
                notice: { errorCode: helpers.noticeHelper.invalidBet },
            },
            {
                failure:
                    settleProcessing || betQueue.some((queue: any) => queue.payload && queue.payload.action === Constants.actions.settle),
                notice: { errorCode: helpers.noticeHelper.cannotPlaceBet },
            },
        ];
    }

    private validateRequest(player: any) {
        const failedCriterion = this.composeRequestValidationCriteria(player).find((criterion) => criterion.failure);
        if (failedCriterion) {
            this.publisher.publishToUser(player.UID, {
                endBet: -1,
                notice: { ...failedCriterion.notice, action: Constants.actions.settle },
            });
            return false;
        }
        return true;
    }

    consume(player: any) {
        if (!this.validateRequest(player)) {
            return;
        }
        const playerName = player.profile.name;
        this.gameData.ingame[playerName]?.betQueue?.push({ player, payload: { action: Constants.actions.settle } });
    }
}
