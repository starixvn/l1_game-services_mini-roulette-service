import { Table } from "sc-game-base";

export default class RouletteGameCron extends Table.Crons.TableGameCron {
    async start() {
        await this.initRoundId();
        await this.queryLastResult();
        await this.initResultHash();
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.settleGameRoundConsumer.settleOldBets();
        this.startCron();
    }

    async proceed() {
        const { durations } = this.definition;
        if (this.gameData.remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
            this.bot && (await this.bot.reset());
        }

        if (!this.gameData.disabled) {
            this.gameData.remainingTime--;
        }

        const remainingTime = this.gameData.remainingTime;
        if (remainingTime % durations.botFrequency === 0) {
            this.bot && (await this.bot.run());
        }

        if (remainingTime < 0) {
            this.gameData.remainingTime = durations.wholeRound;
        }
    }
}
