import { Table } from "sc-game-base";
import { RouletteGameData } from "../roulette-game-data";

export default class RouletteGameCron extends Table.Crons.TableGameCron {
    declare gameData: RouletteGameData;

    async start() {
        await this.roundIdConsumer.initRoundId();
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.getPlayerBetHistory();
        await this.unsettledRoundConsumer.proceed();
        this.startCron();
    }

    async getSettingForNewRound(): Promise<void> {
        await super.getSettingForNewRound();
        // todo: guarantee feature
    }

    async getPlayerBetHistory() {
        // const { accumulatedDays } = this.gameData.guaranteedWinFeature;
        // const betHistory = await this.betQuery?.getBetHistoryByPlayer(accumulatedDays);
        // this.gameData.playerBetHistory = betHistory;
    }

    isStartingTime(remainingTime: number, durations: any) {
        return remainingTime === durations.placingBets + durations.shakeThePlateDuration;
    }
}
