import { Core } from "sc-game-base";

export default class RouletteRoundIdConsumer extends Core.BaseEventConsumers.RoundIdConsumer {
    async initRoundId() {
        await super.initRoundId();
        // increase round id by 100 to avoid conflict with bet timeout
        this.gameData.roundId = this.gameData.roundId + 100;
    }
}
