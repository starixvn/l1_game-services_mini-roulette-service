import { Core } from "sc-game-base";
import { RouletteBetQuery } from "../query-apis";
import RouletteSettleGameRoundConsumer from "../consumers/roulette-settle-game-round-consumer";
import { RouletteGameData } from "../roulette-game-data";
import { getOrDefault } from "sc-game-base/src/core/game-management-api";
import { CurrencyGroupGameConfigs } from "sc-game-management-client";
import { GuaranteedFeature } from "../types";

export default class RouletteGameCron extends Core.Crons.BaseGameCron {
    declare gameData: RouletteGameData;
    declare settleGameRoundConsumer: RouletteSettleGameRoundConsumer;
    betQuery: RouletteBetQuery;

    constructor(props: any) {
        super(props);
        this.betQuery = props.betQuery;
    }

    async start() {
        await this.roundIdConsumer.initRoundId();
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.settleGameRoundConsumer.settleUnsettledBets();
        this.startCron();
    }

    async getSettingForNewRound() {
        await super.getSettingForNewRound();
        await this.getGuaranteedFeatureConfigs();
        await this.getPlayerBetHistory();
    }

    async getGuaranteedFeatureConfigs() {
        const guaranteedFeature = (await getOrDefault(
            this.gameManagementApiClient.currencyGroupGames.getGuaranteedFeatureConfigsByGameId(this.definition.id),
            []
        )) as CurrencyGroupGameConfigs[];
        this.gameData.guaranteedFeature = guaranteedFeature.reduce((acc, curr: CurrencyGroupGameConfigs) => {
            acc[curr.groupId] = curr.value as GuaranteedFeature;
            return acc;
        }, {} as Record<string, GuaranteedFeature>);
    }

    async getPlayerBetHistory() {
        const accumulatedDays = Math.max(
            0,
            ...Object.values(this.gameData.guaranteedFeature).map((guaranteedFeature) => guaranteedFeature.totalDays)
        );
        if (this.gameData.accumulatedDays !== accumulatedDays) {
            this.gameData.accumulatedDays = accumulatedDays;
            this.gameData.playerBetHistory = accumulatedDays > 0 ? await this.betQuery?.getBetHistoryGroupByPlayer(accumulatedDays) : {};
        }
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

        if (remainingTime < 0) {
            this.gameData.remainingTime = durations.wholeRound;
            const now = new Date().getTime();
            await Promise.all(
                Object.values(this.gameData.ingame)
                    .filter(
                        (playerBet) =>
                            Object.keys(playerBet.betTracks).length > 0 &&
                            playerBet.roundId > 0 &&
                            playerBet.betQueue?.length === 0 &&
                            playerBet.betStartTime?.getTime() < now - durations.wholeRound * 1000
                    )
                    .map((playerBet) => this.settleGameRoundConsumer.settleRoundById(playerBet.roundId))
            );
        }
    }
}
