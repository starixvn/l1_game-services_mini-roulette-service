import { controlResultByBet } from "../../../src/helpers/result-control-helper";
import { generateResult, getSettlementResult } from "../../../src/helpers/result-helper";
import { SettlementResult } from "../../../src/types";

const maxBet = 200000;
const FLOATING = 10;
type GuaranteedConfig = {
    threshold: number;
    normal: number;
    weakened: number;
};
const GUARANTEED_WIN_CONFIG: GuaranteedConfig = {
    threshold: maxBet * 36 * 2,
    normal: 80,
    weakened: 60,
};
const GUARANTEED_LOSS_CONFIG: GuaranteedConfig = {
    threshold: maxBet * 36 * 1.5,
    normal: 20,
    weakened: 40,
};
const odds: Record<string, number> = {
    straightUp: 36,
    dozen: 3,
    redBlack: 2,
    oddEven: 2,
};

class Game {
    accumulatedAmount = 0;
    statistics: Record<string, number> = {
        totalBet: 0,
        profit: 0,
        guaranteedNormalWin: 0,
        guaranteedNormalLoss: 0,
        guaranteedWeakenedWin: 0,
        guaranteedWeakenedLoss: 0,
    };
    config: GuaranteedConfig = GUARANTEED_WIN_CONFIG;
    floating = 10;
    randomMode = 1;
    roundId = 0;
    max = 0;
    min = 0;
    status = "";
    isLatestWin = false;

    spin(bet: any) {
        this.roundId++;
        const betData = { ...bet, odds };
        const result = this.getResult(betData);
        this.captureBetResult(betData, result);
    }

    getResult(betData: any) {
        this.setConfig();
        if (this.isReachedThreshold()) {
            const statusKey = `guaranteed${this.status}${this.accumulatedAmount > 0 ? "Loss" : "Win"}`;
            this.statistics[statusKey]++;
            const winningPercentage = this.getWinningPercentage();
            return controlResultByBet(betData, winningPercentage, 1);
        }
        return generateResult(this.randomMode);
    }

    setConfig() {
        this.config = this.accumulatedAmount > 0 ? GUARANTEED_LOSS_CONFIG : GUARANTEED_WIN_CONFIG;
    }

    isReachedThreshold() {
        if (this.isLessThanRange()) {
            this.status = "";
            return false;
        }
        if (this.isReachedWeakenedThreshold()) {
            this.status = "Weakened";
            return true;
        }
        if (this.isReachedNormalThreshold()) {
            this.status = "Normal";
            return true;
        }
        this.status = "";
        return false;
    }

    isLessThanRange() {
        return Math.abs(this.accumulatedAmount) < this.config.threshold - (FLOATING * this.config.threshold) / 100;
    }

    isReachedWeakenedThreshold() {
        if (this.status) {
            return this.accumulatedAmount > 0 ? !this.isLatestWin : this.isLatestWin;
        }
        return false;
    }

    isReachedNormalThreshold() {
        if (this.status) {
            return true;
        }
        const floatingValue = FLOATING ? Math.floor(Math.random() * (FLOATING * 2 + 1) - FLOATING) / 100 : 0;
        const adjustedThreshold = this.config.threshold - floatingValue * this.config.threshold;
        return Math.abs(this.accumulatedAmount) >= adjustedThreshold;
    }

    getWinningPercentage() {
        return this.config[this.status.toLowerCase() as keyof GuaranteedConfig] ?? 0;
    }

    captureBetResult(betData: any, result: number) {
        const settlementResult = getSettlementResult(result);
        const betResult = this.calculateBetResult(settlementResult, betData);
        const profit = betResult.totalWin - betResult.totalBetAmount;
        this.accumulatedAmount += profit;
        this.statistics.totalBet += betResult.totalBetAmount;
        this.statistics.profit += profit;
        // this.statistics[result] = (this.statistics[result] ?? 0) + 1;
        this.isLatestWin = profit > 0;
        this.min = Math.min(this.min, this.accumulatedAmount);
        this.max = Math.max(this.max, this.accumulatedAmount);
    }

    calculateBetResult(settlementResult: SettlementResult, bet: any) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [typeOfBets, winningChoices]) => {
                const choicesPerType = bet[typeOfBets];
                if (choicesPerType) {
                    const oddsOfType = odds?.[typeOfBets] ?? 0;
                    const winningByChoicesOfType: Record<string, number> = {};

                    Object.entries(choicesPerType as Record<string, number>).forEach(([betChoice, betAmount]: [string, number]) => {
                        const win = winningChoices.includes(betChoice);
                        const winAmount = win ? betAmount * oddsOfType : 0;

                        result.totalBetAmount += betAmount;
                        result.totalWin += winAmount;

                        if (winAmount > 0) {
                            result.netWin += winAmount - betAmount;
                            winningByChoicesOfType[betChoice] = winAmount;
                        } else {
                            result.totalLost += betAmount;
                        }

                        return result;
                    });

                    if (Object.keys(winningByChoicesOfType).length !== 0) {
                        result.winningByChoices[typeOfBets] = winningByChoicesOfType;
                    }
                }

                return result;
            },
            {
                totalBetAmount: 0,
                totalWin: 0,
                netWin: 0,
                totalLost: 0,
                winningByChoices: {},
            } as any
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

        return betResult;
    }

    getStatistics() {
        const RPT = (this.statistics.profit / this.statistics.totalBet) * 100 + 100;
        return { RPT, ...this.statistics, min: this.min, max: this.max };
    }
}

xdescribe("Guaranteed Feature Statistic", () => {
    const bets = [
        {
            oddEven: { even: maxBet },
        },
        {
            redBlack: { black: maxBet },
        },
        {
            dozen: { "1": maxBet },
        },
        {
            straightUp: { "1": maxBet },
        },
    ];
    it.each(bets)("run", (bet) => {
        // Arrange
        const game = new Game();
        const maxRound = 23_000;

        // Act
        for (let i = 0; i < maxRound; i++) {
            game.spin(bet);
        }

        // Assert
        console.log(game.getStatistics());
    });
});
