import Constants from "../constants";

const numberOfColumns = 12;

const listWinningChoicesOfStraightUp = (number) => [number.toString()];

const listWinningChoicesOfDozen = (number) => (number > 0 ? [(~~((number - 1) / numberOfColumns) + 1).toString()] : []);

const listWinningChoicesOfRedBlack = (number) => {
    if (Constants.numberWheel.red.includes(number)) {
        return ["red"];
    }

    if (Constants.numberWheel.black.includes(number)) {
        return ["black"];
    }

    return [];
};

const listWinningChoicesOfOddEven = (number) => {
    if (number !== 0) {
        return number % 2 === 0 ? ["even"] : ["odd"];
    }

    return [];
};

export const generateChoiceByNumber = (number) => {
    return {
        straightUp: listWinningChoicesOfStraightUp(number),
        dozen: listWinningChoicesOfDozen(number),
        redBlack: listWinningChoicesOfRedBlack(number),
        oddEven: listWinningChoicesOfOddEven(number),
    };
};

export const getBetChoicesGroupByNumbers = () =>
    [...Array(Constants.numberWheel.max + 1).keys()].map((number) => generateChoiceByNumber(number));

export const getBetChoicesGroupByTypes = () => {
    const betChoices = getBetChoicesGroupByNumbers();

    const draftResult = betChoices.reduce((groupByTypes, choicesPerNumber) => {
        Object.entries(choicesPerNumber).forEach(([type, choices]) => {
            groupByTypes[type] = (groupByTypes[type] ?? []).concat(choices);
        });

        return groupByTypes;
    }, {});

    return Object.entries(draftResult).reduce((sortedResult, [type, choices]) => {
        sortedResult[type] = Array.from(new Set(choices)).sort();

        return sortedResult;
    }, {});
};

export const buildBetAmountIncrement = (betChoices) => {
    const increment = {};

    Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
        Object.entries(choicesPerType).forEach(([betChoice, amount]) => {
            increment[`${typeOfBets}.${betChoice}`] = amount;
        });
    });

    return increment;
};
