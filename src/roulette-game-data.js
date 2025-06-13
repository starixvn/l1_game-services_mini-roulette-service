import { Table } from "sc-game-base";

export class RouletteGameData extends Table.TableGameData {
    constructor(remainingTime) {
        super(remainingTime);
        this.playerBetHistory = {};
        this.guaranteedWinFeature = {
            enable: false,
            accumulatedDays: 3,
            probabilities: [],
        };
    }
}
