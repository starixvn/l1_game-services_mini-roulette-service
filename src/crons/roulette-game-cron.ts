import { Table } from "sc-game-base";
import { RouletteGameData } from "../roulette-game-data";
import RouletteBetQuery from "../query-apis/roulette-bet-query";

export default class RouletteGameCron extends Table.Crons.TableGameCron {
    declare gameData: RouletteGameData;
    declare betQuery: RouletteBetQuery;

    constructor(props: any) {
        super(props);
        this.betQuery = props.betQuery;
    }

    async getSettingForNewRound(): Promise<void> {
        await super.getSettingForNewRound();
        // todo: get guaranteed feature & get player bet history if totalDays changed
    }

    async getPlayerBetHistory() {
        const betHistory = await this.betQuery?.getBetHistoryByPlayer(this.gameData.accumulatedDays ?? 0);
        this.gameData.playerBetHistory = betHistory;
    }

    isStartingTime(remainingTime: number, durations: any) {
        return remainingTime === durations.placingBets + durations.shakeThePlateDuration;
    }
}
