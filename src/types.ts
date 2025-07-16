export type RouletteBet = {
    uid: string;
    name: string;
    straightUp?: Record<string, number>;
    dozen?: Record<string, number>;
    redBlack?: Record<string, number>;
    oddEven?: Record<string, number>;
    totalAmount?: number;
    betwin?: number;
    time: Date;
    odds?: Record<string, number>;
    siteId?: string;
    freeBet: boolean;
    currency?: string;
    rate?: number;
    playerId?: string;
    operatorId?: string;
    roundId: number;
    paid?: boolean;
    clientSeed?: Date;
    appType?: number;
    currencyGroupId?: string;
    guaranteedFeature?: GuaranteedFeature;
    guaranteedWinStatus?: string;
    guaranteedLossStatus?: string;
    accumulatedAmount?: number;
    settlementDetails?: Array<{
        choiceId: number;
        totalAmount: number;
        validBetAmount: number;
        totalWin: number;
    }>;
};

export type RouletteBetLog = {
    uid?: string;
    time: Date;
    straightUp?: Record<string, number>;
    dozen?: Record<string, number>;
    redBlack?: Record<string, number>;
    oddEven?: Record<string, number>;
    siteId?: string;
    currency?: string;
    rate?: number;
    playerId?: string;
    operatorId?: string;
    roundId?: number;
    currencyGroupId?: string;
    appType?: number;
};

export type SettlementResult = {
    straightUp: string[];
    dozen: string[];
    redBlack: string[];
    oddEven: string[];
};

export type RouletteRound = {
    id: number;
    uid: string;
    result: number;
    settlementResult: SettlementResult;
    time: Date;
    exchangeRateId: number;
};

export type ThresholdSetting = {
    threshold: number;
    normalWinningPercentage: number;
    enabledWeakened: boolean;
    weakenedWinningPercentage: number;
};
export type GuaranteedConfig = {
    enabled: boolean;
    floating: number;
    thresholdSettings: ThresholdSetting[];
};
export type GuaranteedFeature = {
    gamingDays: number;
    totalDays: number;
    guaranteedWin?: GuaranteedConfig;
    guaranteedLoss?: GuaranteedConfig;
};
export type GuaranteedStatus = {
    guaranteedWinStatus: string;
    guaranteedLossStatus: string;
    winningPercentage: number;
    isReached: boolean;
    accumulatedAmount: number;
};

export type PlayerBetHistory = {
    totalAmount: number;
    betwin: number;
    time: Date;
    guaranteedWinStatus: string;
    guaranteedLossStatus: string;
    roundId: number;
};
