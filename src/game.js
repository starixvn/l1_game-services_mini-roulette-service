import { controlResultByBet } from "./helpers/result-control-helper";
import { generateResult, getSettlementResult } from "./helpers/result-helper";

const FLOATING = 5;
const MAX_BET = 40_000;
const WINNING_THRESHOLDS = [
    { threshold: 36 * MAX_BET * 1.5, winningPercentage: 2 },
    { threshold: (36 * MAX_BET * 1.5) / 2, winningPercentage: 5 },
];
const LOSING_THRESHOLDS = [
    { threshold: 36 * MAX_BET * 2, winningPercentage: 80 },
    { threshold: 36 * MAX_BET, winningPercentage: 60 },
];

const bets = [
    { straightUp: { 1: MAX_BET / 20 } },
    { straightUp: { 0: MAX_BET / 20, 2: MAX_BET / 20, 4: MAX_BET / 20, 6: MAX_BET / 20 } },
    { dozen: { 1: MAX_BET / 2 } },
    { dozen: { 1: MAX_BET / 2, 2: MAX_BET / 2 } },
    { redBlack: { red: MAX_BET } },
    { oddEven: { even: MAX_BET } },
    { straightUp: { 1: MAX_BET / 20 }, dozen: { 1: MAX_BET / 2 }, oddEven: { even: MAX_BET / 2 - MAX_BET / 20 } },
];
// const bet = { straightUp: { 1: MAX_BET / 20 } };

const odds = {
    straightUp: 36,
    dozen: 3,
    redBlack: 2,
    oddEven: 2,
};
class Game {
    accumulatedAmount = 0;
    statistics = { totalBet: 0, profit: 0, controlResult: 0 };
    config = {};
    floating = 10;
    randomMode = 1;
    roundId = 0;
    max = 0;
    min = 0;
    reset() {
        this.accumulatedAmount = 0;
        this.statistics = { totalBet: 0, profit: 0, controlResult: 0 };
    }

    spin(bet) {
        this.roundId++;
        const betData = { ...bet, odds };
        const result = this.getResult(betData);
        this.captureBetResult(betData, result);
    }

    getResult(betData) {
        this.setConfig();
        this.setFloatingValue();
        if (this.isReachedThreshold()) {
            const winningPercentage = this.getWinningPercentage();
            this.statistics.controlResult++;
            return controlResultByBet(betData, winningPercentage);
        }
        return generateResult(this.randomMode);
    }

    calculateBetResult(settlementResult, bet, odds) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [typeOfBets, winningChoices]) => {
                const choicesPerType = bet[typeOfBets];
                if (choicesPerType) {
                    const oddsOfType = odds?.[typeOfBets] ?? 0;
                    const winningByChoicesOfType = {};

                    Object.entries(choicesPerType).forEach(([betChoice, betAmount]) => {
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
            }
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

        return betResult;
    }

    captureBetResult(betData, result) {
        const settlementResult = getSettlementResult(result);
        const betResult = this.calculateBetResult(settlementResult, betData, odds);
        const profit = betResult.totalWin - betResult.totalBetAmount;
        this.accumulatedAmount += profit;
        this.statistics.totalBet += betResult.totalBetAmount;
        this.statistics.profit += profit;
        this.min = Math.min(this.min, this.accumulatedAmount);
        this.max = Math.max(this.max, this.accumulatedAmount);
    }

    setConfig() {
        this.config = this.accumulatedAmount > 0 ? WINNING_THRESHOLDS : LOSING_THRESHOLDS;
        // this.config = LOSING_THRESHOLDS;
    }

    setFloatingValue() {
        this.floating = Math.floor(Math.random() * (FLOATING * 2 + 1) - FLOATING) / 100;
    }

    isReachedThreshold() {
        const probabilities = this.config;
        return probabilities?.some((p) => Math.abs(this.accumulatedAmount) >= p.threshold + this.floating * p.threshold);
    }

    getWinningPercentage() {
        const probabilities = this.config;
        const probability = probabilities
            .sort((a, b) => b.threshold - a.threshold)
            .find((p) => Math.abs(this.accumulatedAmount) >= p.threshold + this.floating * p.threshold);
        return probability?.winningPercentage ?? 0;
    }

    getStatistics() {
        const RPT = (this.statistics.profit / this.statistics.totalBet) * 100 + 100;
        return { RPT, ...this.statistics, min: this.min, max: this.max };
    }
}

const run = (bet) => {
    const game = new Game();
    for (let i = 0; i < 100_000; i++) {
        game.spin(bet);
    }
    console.log(game.getStatistics());
};

const generateRandomBets = () => {
    const betTypes = {
        redBlack: {
            probability: 0.35,
            maxAmount: 500,
            minAmount: 1,
            getSelection: () => (Math.random() < 0.5 ? "red" : "black"),
        },
        oddEven: {
            probability: 0.35,
            maxAmount: 500,
            minAmount: 1,
            getSelection: () => (Math.random() < 0.5 ? "odd" : "even"),
        },
        dozen: {
            probability: 0.2,
            maxAmount: 100,
            minAmount: 1,
            getSelection: () => Math.floor(Math.random() * 3) + 1,
        },
        straightUp: {
            probability: 0.1,
            maxAmount: 20,
            minAmount: 1,
            getSelection: () => Math.floor(Math.random() * 37),
        },
    };

    const getRandomBetType = () => {
        const r = Math.random();
        let cumulative = 0;

        for (const [type, config] of Object.entries(betTypes)) {
            cumulative += config.probability;
            if (r <= cumulative) {
                return type;
            }
        }
        return "redBlack"; // Default fallback
    };

    const getRandomAmount = (min, max) => {
        return (Math.floor(Math.random() * (max - min + 1)) + min) * 10;
    };

    const numBets = Math.floor(Math.random() * 3) + 1;
    const bet = {};
    let totalAmount = 0;
    for (let i = 0; i < numBets; i++) {
        const selectedType = getRandomBetType();
        const config = betTypes[selectedType];

        const amount = getRandomAmount(config.minAmount, config.maxAmount);
        const selection = config.getSelection();

        bet[selectedType] = { [selection]: amount };
        totalAmount += amount;
        if (totalAmount > MAX_BET) {
            break;
        }
    }

    return bet;
};
const run2 = () => {
    const game = new Game();
    for (let i = 0; i < 100_000; i++) {
        const bet = generateRandomBets();
        game.spin(bet);
    }
    console.log(game.getStatistics());
};

bets.forEach((bet) => {
    run(bet);
});
console.log("--------------------------------");
for (let i = 0; i < 3; i++) {
    run2();
}
