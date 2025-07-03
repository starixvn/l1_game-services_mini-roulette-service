import { Core } from "sc-game-base";
import { RouletteBetQuery } from "../query-apis";
import RouletteSettleGameRoundConsumer from "../consumers/roulette-settle-game-round-consumer";
import { RouletteGameData } from "../roulette-game-data";

export default class RouletteGameCron extends Core.Crons.BaseGameCron {
    declare gameData: RouletteGameData;
    betQuery: RouletteBetQuery;
    declare settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    constructor(props: any) {
        super(props);
        this.betQuery = props.betQuery;
    }

    async start() {
        await this.roundIdConsumer.initRoundId();
        await this.queryLastResult();
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.getPlayerBetHistory();
        await this.settleGameRoundConsumer.settleUnsettledBets();
        this.startCron();
    }

    async getSettingForNewRound() {
        await super.getSettingForNewRound();
        // TODO: get guaranteed win feature
    }

    async getPlayerBetHistory() {
        // TODO: get player bet history
        const { accumulatedDays } = this.gameData.guaranteedWinFeature;
        const betHistory = await this.betQuery?.getBetHistoryByPlayer(accumulatedDays);
        this.gameData.playerBetHistory = betHistory;
    }

    async proceed() {
        const { durations } = this.definition;
        if (this.gameData.remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
        }

        if (!this.gameData.disabled) {
            this.gameData.remainingTime--;
        }

        const remainingTime = this.gameData.remainingTime;
        // if (remainingTime % durations.botFrequency === 0) {
        //     this.bot && (await this.bot.run());
        // }

        if (remainingTime < 0) {
            this.gameData.remainingTime = durations.wholeRound;
        }
    }
}
