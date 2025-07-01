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
    isControl?: boolean;
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
};

export type SettlementResult = {
    straightUp: string[];
    dozen: string[];
    redBlack: string[];
    oddEven: string[];
};

export type RouletteRound = {
    id: number;
    result: number;
    settlementResult: SettlementResult;
    time: Date;
    exchangeRateId: number;
};

export type RoulettePlayerRound = {
    uid: string;
    name: string;
    playerId: string;
    operatorId: string;
} & RouletteRound;
