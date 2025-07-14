import Constants from "../constants";

const numberOfColumns = 12;

const listWinningChoicesOfStraightUp = (number: number) => [number.toString()];

const listWinningChoicesOfDozen = (number: number) => (number > 0 ? [(~~((number - 1) / numberOfColumns) + 1).toString()] : []);

const listWinningChoicesOfRedBlack = (number: number) => {
    if (Constants.numberWheel.red.includes(number)) {
        return ["red"];
    }

    if (Constants.numberWheel.black.includes(number)) {
        return ["black"];
    }

    return [];
};

const listWinningChoicesOfOddEven = (number: number) => {
    if (number !== 0) {
        return number % 2 === 0 ? ["even"] : ["odd"];
    }

    return [];
};

export const generateChoiceByNumber = (number: number) => {
    return {
        straightUp: listWinningChoicesOfStraightUp(number),
        dozen: listWinningChoicesOfDozen(number),
        redBlack: listWinningChoicesOfRedBlack(number),
        oddEven: listWinningChoicesOfOddEven(number),
    };
};

export const getBetChoicesGroupByNumbers = () =>
    [...Array(Constants.numberWheel.max + 1).keys()].map((number) => generateChoiceByNumber(number));

export const getBetChoicesGroupByTypes = (): Record<string, string[]> => {
    const betChoices = getBetChoicesGroupByNumbers();

    const draftResult = betChoices.reduce((groupByTypes: Record<string, string[]>, choicesPerNumber) => {
        Object.entries(choicesPerNumber).forEach(([type, choices]) => {
            groupByTypes[type] = (groupByTypes[type] ?? []).concat(choices);
        });

        return groupByTypes;
    }, {});

    return Object.entries(draftResult).reduce((sortedResult: Record<string, string[]>, [type, choices]) => {
        sortedResult[type] = Array.from(new Set(choices)).sort();

        return sortedResult;
    }, {});
};

export const buildBetAmountIncrement = (betChoices: Record<string, Record<string, number>>) => {
    const increment: Record<string, number> = {};

    Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
        Object.entries(choicesPerType).forEach(([betChoice, amount]) => {
            increment[`${typeOfBets}.${betChoice}`] = amount;
        });
    });

    return increment;
};

export const trackBetChoices = (
    tracks: Record<string, Record<string, number>>,
    betChoices: Record<string, Record<string, number>>,
    rate: number,
    reduce = false
) => {
    betChoices &&
        Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
            const trackChoicesPerType = tracks[typeOfBets] || {};

            Object.entries(choicesPerType).forEach(([betChoice, amount]) => {
                trackChoicesPerType[betChoice] = reduce
                    ? trackChoicesPerType[betChoice] - amount * rate
                    : (trackChoicesPerType[betChoice] || 0) + amount * rate;

                if (trackChoicesPerType[betChoice] === 0) {
                    delete trackChoicesPerType[betChoice];
                }
            });

            if (!tracks[typeOfBets]) {
                tracks[typeOfBets] = trackChoicesPerType;
            }
        });
};
