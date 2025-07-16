import Constants from "../constants";
import { convertToGMTDate, getStartDate } from "../helpers/day-helper";
import { RouletteGameData } from "../roulette-game-data";
import { GuaranteedConfig, GuaranteedFeature, RouletteBet, ThresholdSetting } from "../types";

export default class RouletteGuaranteedFeatureConsumer {
    declare gameData: RouletteGameData;
    constructor({ gameData }: { gameData: RouletteGameData }) {
        this.gameData = gameData;
    }

    async calculateGuaranteedFeatureStatus(bet: RouletteBet) {
        const { guaranteedFeature, uid } = bet;
        if (!guaranteedFeature) {
            return null;
        }
        const accumulatedAmount = await this.calculatePlayerAccumulatedAmount(uid, guaranteedFeature);
        const config = this.getApplicableGuaranteedConfig(guaranteedFeature, accumulatedAmount);
        const reachedStatus = this.determineGuaranteedStatus(uid, accumulatedAmount, config);
        return {
            guaranteedWinStatus: accumulatedAmount < 0 ? reachedStatus.status : "",
            guaranteedLossStatus: accumulatedAmount > 0 ? reachedStatus.status : "",
            winningPercentage: reachedStatus.winningPercentage,
            isReached: !!reachedStatus?.status,
            accumulatedAmount,
        };
    }

    private async calculatePlayerAccumulatedAmount(uid: string, guaranteedFeature: GuaranteedFeature) {
        if (!this.gameData.playerBetHistory?.[uid] || !guaranteedFeature) {
            return 0;
        }
        const { gamingDays, totalDays } = guaranteedFeature;
        if (totalDays <= 0 || gamingDays <= 0) {
            return 0;
        }
        return this.getRecentGamingDays(uid, guaranteedFeature).reduce((total: number, bet) => {
            return total + (bet.betwin || 0) - (bet.totalAmount || 0);
        }, 0);
    }

    private getRecentGamingDays(uid: string, guaranteedFeature: GuaranteedFeature): any[] {
        const { gamingDays, totalDays } = guaranteedFeature;
        const utcStartDate = getStartDate(totalDays);
        const recentHistory = this.gameData.playerBetHistory[uid].filter((bet) => bet.time && new Date(bet.time) >= utcStartDate);
        const betsByDate = recentHistory.reduce((acc: Record<string, any[]>, bet) => {
            const dateStr = convertToGMTDate(bet.time).toDateString();
            acc[dateStr] = acc[dateStr] || [];
            acc[dateStr].push(bet);
            return acc;
        }, {});
        const hasToday = Object.keys(betsByDate).some((date) => date === convertToGMTDate(new Date()).toDateString());

        const sortedDates = Object.keys(betsByDate)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .slice(0, hasToday ? gamingDays + 1 : gamingDays);

        return sortedDates.flatMap((date) => betsByDate[date]);
    }

    private getApplicableGuaranteedConfig(guaranteedFeature: GuaranteedFeature, accumulatedAmount: number) {
        return accumulatedAmount < 0 ? guaranteedFeature.guaranteedWin : guaranteedFeature.guaranteedLoss;
    }

    private determineGuaranteedStatus(uid: string, accumulatedAmount: number, config?: GuaranteedConfig | null) {
        const defaultStatus = { status: Constants.guaranteedStatus.exited, winningPercentage: 0 };
        if (!config || !config.enabled) {
            return defaultStatus;
        }
        const thresholdSetting = this.findMatchingThreshold(accumulatedAmount, config);
        if (!thresholdSetting) {
            return defaultStatus;
        }
        if (thresholdSetting.enabledWeakened && this.isReachedWeakened(uid, accumulatedAmount)) {
            return { status: Constants.guaranteedStatus.weakened, winningPercentage: thresholdSetting.weakenedWinningPercentage };
        }
        if (this.isReachedNormal(accumulatedAmount, thresholdSetting, config.floating)) {
            return { status: Constants.guaranteedStatus.normal, winningPercentage: thresholdSetting.normalWinningPercentage };
        }
        return defaultStatus;
    }

    private findMatchingThreshold(accumulatedAmount: number, config: GuaranteedConfig) {
        const { floating } = config;
        return config.thresholdSettings?.find(
            (p: ThresholdSetting) => Math.abs(accumulatedAmount) >= p.threshold - (floating * p.threshold) / 100
        );
    }

    private isReachedNormal(accumulatedAmount: number, thresholdSetting: ThresholdSetting, floating: number) {
        const floatingValue = floating ? Math.floor(Math.random() * (floating * 2 + 1) - floating) / 100 : 0;
        const adjustedThreshold = thresholdSetting.threshold - floatingValue * thresholdSetting.threshold;
        return Math.abs(accumulatedAmount) >= adjustedThreshold;
    }

    private isReachedWeakened(uid: string, accumulatedAmount: number) {
        const latestBet = this.getPlayerLatestBet(uid);
        if (!latestBet) {
            return false;
        }
        const isLatestBetWin = latestBet.betwin - latestBet.totalAmount > 0;
        const currentStatus = accumulatedAmount > 0 ? latestBet.guaranteedLossStatus : latestBet.guaranteedWinStatus;
        if (currentStatus === Constants.guaranteedStatus.normal) {
            return accumulatedAmount > 0 ? !isLatestBetWin : isLatestBetWin;
        }
        return false;
    }

    private getPlayerLatestBet(uid: string) {
        return this.gameData.playerBetHistory?.[uid]?.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())?.[0];
    }
}
