import { Table } from "sc-game-base";
import { GuaranteedFeature, PlayerBetHistory } from "./types";

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
