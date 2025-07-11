import { helpers } from "sc-common";
import RouletteSettleGameRoundConsumer from "./roulette-settle-game-round-consumer";
import { RouletteGameData } from "../roulette-game-data";
import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";
import Constants from "../constants";

export default class RouletteActionSettleConsumer {
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

    private validateRequest(player: any) {
        const playerName = player?.profile?.name;
        if (!this.gameData.ingame[playerName]) {
            this.publisher.publishToUser(player.UID, {
                endBet: -1,
                notice: { errorCode: helpers.noticeHelper.invalidBet, action: Constants.actions.settle },
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
