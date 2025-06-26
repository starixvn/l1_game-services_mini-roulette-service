import { Table } from "sc-game-base";

export class RouletteGameData extends Table.TableGameData {
    constructor(remainingTime) {
        super(remainingTime);
        this.playerBetHistory = {};
        this.guaranteedWinFeature = {
            enable: false,
            accumulatedDays: 3,
            floating: 5,
            probabilities: [
                { threshold: 360000, winningPercentage: 80 },
                { threshold: 180000, winningPercentage: 60 },
            ],
        };
        this.guaranteeLossFeature = {
            enable: false,
            accumulatedDays: 3,
            floating: 5,
            probabilities: [
                { threshold: 360000, winningPercentage: 20 },
                { threshold: 180000, winningPercentage: 40 },
            ],
        };
    }
}
