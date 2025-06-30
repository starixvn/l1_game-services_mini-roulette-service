import { UnsettledRoundConsumer } from "sc-game-base/src/core/event-consumers";

export default class RouletteUnsettledRoundConsumer extends UnsettledRoundConsumer {
    async proceed() {
        const unsettledBets = await this.getUnsettledBets();
        if (unsettledBets.length > 0) {
            await this.loadGameConfigs();
            await this.settleGameRoundConsumer.settleRound();
        }
    }
}
