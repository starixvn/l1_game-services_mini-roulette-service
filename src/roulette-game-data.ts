import { Table } from "sc-game-base";

type ThresholdSetting = {
    threshold: number;
    normalWinningPercentage: number;
    enabledWeakened: boolean;
    weakenedWinningPercentage: number;
};
type GuaranteedConfig = {
    enabled: boolean;
    floating: number;
    thresholdSettings: ThresholdSetting[];
};
type GuaranteedFeature = {
    currencyGroupId: string;
    gamingDays: number;
    totalDays: number;
    guaranteedWin?: GuaranteedConfig;
    guaranteedLoss?: GuaranteedConfig;
};
export class RouletteGameData extends Table.TableGameData {
    constructor(remainingTime: number) {
        super(remainingTime);
        this.playerBetHistory = {};
        this.guaranteedFeature = [
            {
                currencyGroupId: "1",
                gamingDays: 3,
                totalDays: 7,
                guaranteedWin: {
                    enabled: false,
                    floating: 5,
                    thresholdSettings: [],
                },
                guaranteedLoss: {
                    enabled: false,
                    floating: 5,
                    thresholdSettings: [],
                },
            },
        ];
        this.accumulatedDays = 0;
    }
    playerBetHistory: Record<string, any>;
    guaranteedFeature: GuaranteedFeature[];
    accumulatedDays: number;
}
