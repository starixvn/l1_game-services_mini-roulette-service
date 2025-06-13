import { Table } from "sc-game-base";

export class RouletteGameData extends Table.TableGameData {
    constructor(remainingTime) {
        super(remainingTime);
        this.playerBetHistory = {};
        this.guaranteedWinFeature = {
            enable: true,
            accumulatedDays: 3,
            probabilities: [
                { threshold: 360000, winningPercentage: 80 },
                { threshold: 180000, winningPercentage: 60 },
            ],
        };
    }
}
