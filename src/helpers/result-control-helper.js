import Chance from "chance";
import Constants from "../constants";

const extractBetTypes = (bet) => {
    const { betTypes } = Constants;

    const processBetType = (betType, betData) => {
        if (!betData) return [];

        return Object.entries(betData).map(([choice, amount]) => ({
            betType,
            choice,
            amount,
            odds: bet.odds[betType],
        }));
    };

    return [
        ...processBetType(betTypes.straightUp, bet[betTypes.straightUp]),
        ...processBetType(betTypes.dozen, bet[betTypes.dozen]),
        ...processBetType(betTypes.redBlack, bet[betTypes.redBlack]),
        ...processBetType(betTypes.oddEven, bet[betTypes.oddEven]),
        ...processBetType(betTypes.bigSmall, bet[betTypes.bigSmall]),
    ];
};

const isWinningNumber = (number, betType, choice) => {
    const { numberWheel, betTypes } = Constants;

    switch (betType) {
        case betTypes.straightUp:
            return number === +choice;
        case betTypes.dozen:
            const start = (+choice - 1) * 12 + 1;
            return number >= start && number < start + 12;
        case betTypes.redBlack:
            if (choice === "red") return numberWheel.red.includes(number);
            if (choice === "black") return numberWheel.black.includes(number);
            return false;
        case betTypes.oddEven:
            if (number === 0) return false;
            if (choice === "odd") return number % 2 === 1;
            if (choice === "even") return number % 2 === 0;
            return false;
        case betTypes.bigSmall:
            if (number === 0) return false;
            if (choice === "big") return number > 18;
            if (choice === "small") return number <= 18;
            return false;
        default:
            return false;
    }
};

const calculateNumberResults = (bets, number) => {
    let totalPayout = 0;
    const winningBets = [];

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

const calculateAllNumberResults = (bet) => {
    const { numberWheel } = Constants;
    const bets = extractBetTypes(bet);

    const results = [];
    for (let number = numberWheel.min; number <= numberWheel.max; number++) {
        results.push(calculateNumberResults(bets, number));
    }

    return results.sort((a, b) => b.profit - a.profit);
};

export const controlResultByBet = (bet, winningPercentage) => {
    const chance = new Chance();
    const shouldWin = chance.bool({ likelihood: winningPercentage });

    // Calculate results for all numbers
    const allResults = calculateAllNumberResults(bet);
    // Split numbers into winning (profit > 0) and losing (profit <= 0) groups
    const winningNumbers = allResults.filter((result) => result.profit > 0).map((result) => result.number);
    const losingNumbers = allResults.filter((result) => result.profit <= 0).map((result) => result.number);

    // If there are no winning or losing numbers, return a random number
    if (winningNumbers.length === 0 || losingNumbers.length === 0) {
        return chance.integer({ min: Constants.numberWheel.min, max: Constants.numberWheel.max });
    }

    // Pick from either winning or losing numbers based on winningPercentage
    return chance.pickone(shouldWin ? winningNumbers : losingNumbers);
};
