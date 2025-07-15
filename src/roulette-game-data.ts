import { Table } from "sc-game-base";
import { GuaranteedFeature } from "./types";

type PlayerBetHistory = {
    totalAmount: number;
    betwin: number;
    time: Date;
    guaranteedWinStatus: string;
    guaranteedLossStatus: string;
    roundId: number;
};

export class RouletteGameData extends Table.TableGameData {
    playerBetHistory: { [uid: string]: PlayerBetHistory[] };
    guaranteedFeature: { [currencyGroupId: string]: GuaranteedFeature };
    accumulatedDays: number;
    constructor(remainingTime: number) {
        super(remainingTime);
        this.playerBetHistory = {};
        this.guaranteedFeature = {};
        this.accumulatedDays = 0;
    }
}
