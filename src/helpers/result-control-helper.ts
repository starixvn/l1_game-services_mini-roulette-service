import Chance from "chance";
import Constants from "../constants";
import { RouletteBet } from "../types";
import { generateResult } from "./result-helper";

type ExtractBetTypes = {
    betType: string;
    choice: string;
    amount: number;
    odds: number;
};
type NumberResult = {
    number: number;
    totalPayout: number;
    profit: number;
    winningBets: ExtractBetTypes[];
};

const extractBetTypes = (bet: RouletteBet) => {
    const { betTypes } = Constants;

    const processBetType = (betType: string, betData: Record<string, number> | undefined) => {
        if (!betData) {
            return [];
        }

        return Object.entries(betData).map(([choice, amount]) => ({
            betType,
            choice,
            amount,
            odds: bet.odds?.[betType] ?? 1,
        }));
    };

    return [
        ...processBetType(betTypes.straightUp, (bet as any)[betTypes.straightUp]),
        ...processBetType(betTypes.dozen, (bet as any)[betTypes.dozen]),
        ...processBetType(betTypes.redBlack, (bet as any)[betTypes.redBlack]),
        ...processBetType(betTypes.oddEven, (bet as any)[betTypes.oddEven]),
    ];
};

const isWinningNumber = (number: number, betType: string, choice: string) => {
    const { numberWheel, betTypes } = Constants;

    switch (betType) {
        case betTypes.straightUp:
            return number === +choice;
        case betTypes.dozen: {
            const start = (+choice - 1) * 12 + 1;
            return number >= start && number < start + 12;
        }
        case betTypes.redBlack:
            if (choice === "red") {
                return numberWheel.red.includes(number);
            }
            if (choice === "black") {
                return numberWheel.black.includes(number);
            }
            return false;
        case betTypes.oddEven:
            if (number === 0) {
                return false;
            }
            if (choice === "odd") {
                return number % 2 === 1;
            }
            if (choice === "even") {
                return number % 2 === 0;
            }
            return false;
        default:
            return false;
    }
};

const calculateNumberResults = (bets: ExtractBetTypes[], number: number) => {
    let totalPayout = 0;
    const winningBets: (ExtractBetTypes & { payout: number })[] = [];

    bets.forEach((bet) => {
        if (isWinningNumber(number, bet.betType, bet.choice)) {
            const payout = bet.amount * bet.odds;
            totalPayout += payout;
            winningBets.push({
                ...bet,
                payout,
            });
        }
    });

    return {
        number,
        totalPayout,
        profit: totalPayout - bets.reduce((sum, bet) => sum + bet.amount, 0),
        winningBets,
    };
};

const calculateAllNumberResults = (bet: RouletteBet): NumberResult[] => {
    const { numberWheel } = Constants;
    const bets = extractBetTypes(bet);

    const results = [];
    for (let number = numberWheel.min; number <= numberWheel.max; number++) {
        results.push(calculateNumberResults(bets, number));
    }

    return results.sort((a, b) => b.profit - a.profit);
};

const adjustWinningPercentageForBetTypes = (baseWinningPercentage: number, allResults: NumberResult[]) => {
    const winningResults = allResults.filter((result) => result.profit > 0);
    const naturalProbability = winningResults.length / (Constants.numberWheel.max + 1);
    const adjustmentFactor = naturalProbability / 0.5;
    const adjustedPercentage = baseWinningPercentage * adjustmentFactor;

    // Clamp the result between 0 and 100
    return Math.max(0, Math.min(100, adjustedPercentage));
};

const createWinningNumberPool = (allResults: NumberResult[]) => {
    // Get profitable numbers, fallback to break-even numbers if none profitable
    const profitableResults = allResults.filter((result) => result.profit > 0);
    if (profitableResults.length === 0) {
        return allResults.filter((result) => result.profit === 0).map((result) => result.number);
    }

    // Normalize weights to create meaningful selection probabilities
    const maxProfit = Math.max(...profitableResults.map((result) => result.profit));
    const normalizedWeightedNumbers = profitableResults.map((item) => ({
        number: item.number,
        normalizedWeight: maxProfit / item.profit,
    }));

    // Create selection pool with repeated numbers based on weight
    const selectionPool: number[] = [];
    normalizedWeightedNumbers.forEach((item) => {
        for (let i = 0; i < item.normalizedWeight; i++) {
            selectionPool.push(item.number);
        }
    });
    const chance = new Chance();
    return chance.shuffle(selectionPool);
};

export const controlResultByBet = (bet: RouletteBet, winningPercentage: number, randomMode: number) => {
    const chance = new Chance();
    const allResults = calculateAllNumberResults(bet);
    const adjustedWinningPercentage = adjustWinningPercentageForBetTypes(winningPercentage, allResults);
    const shouldWin = chance.bool({ likelihood: adjustedWinningPercentage });
    const expectedNumbers = shouldWin
        ? createWinningNumberPool(allResults)
        : allResults.filter((result) => result.profit <= 0).map((result) => result.number);
    if (expectedNumbers.length === 0) {
        return generateResult(randomMode);
    }

    return chance.pickone(expectedNumbers);
};
