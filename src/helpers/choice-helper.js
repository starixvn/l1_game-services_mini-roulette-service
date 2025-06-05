import Constants from "../constants";

const numberOfRows = 3;
const numberOfColumns = 12;
const rowTopEdge = 2;
const rowBottomEdge = 0;
const columnLeftEdge = 0;
const columnRightEdge = 11;

const getPosition = (number) => ({
    x: ~~((number - 1) / numberOfRows),
    y: (number - 1) % numberOfRows,
});

const getNeighbors = (number) => {
    const position = getPosition(number);
    const neighbors = {};

    if (position.y < rowTopEdge) {
        neighbors.top = number + 1;

        if (position.x < columnRightEdge) {
            neighbors.topRight = number + 4;
        }
    }

    if (position.x < columnRightEdge) {
        neighbors.right = number + 3;
    }

    if (position.y > rowBottomEdge) {
        neighbors.bottom = number - 1;

        if (position.x < columnRightEdge) {
            neighbors.bottomRight = number + 2;
        }
    }

    if (position.x > columnLeftEdge) {
        neighbors.left = number - 3;

        if (position.y < rowTopEdge) {
            neighbors.topLeft = number - 2;
        }

        if (position.y > rowBottomEdge) {
            neighbors.bottomLeft = number - 4;
        }
    }

    return neighbors;
};

const listWinningChoicesOfStraightUp = (number) => [number.toString()];

const listWinningChoicesOfSplit = (number, neighbors) => {
    if (neighbors) {
        const winningChoices = [];

        if (neighbors.left) {
            winningChoices.push(`${neighbors.left}-${number}`);
        } else {
            winningChoices.push(`0-${number}`);
        }

        if (neighbors.bottom) {
            winningChoices.push(`${neighbors.bottom}-${number}`);
        }

        if (neighbors.top) {
            winningChoices.push(`${number}-${neighbors.top}`);
        }

        if (neighbors.right) {
            winningChoices.push(`${number}-${neighbors.right}`);
        }

        return winningChoices;
    }

    return ["0-1", "0-2", "0-3"];
};

const listWinningChoicesOfStreet = (number) => {
    if (number > 0) {
        const position = getPosition(number);
        const firstNumberInStreet = number - position.y;
        const secondNumberInStreet = firstNumberInStreet + 1;
        const thirdNumberInStreet = secondNumberInStreet + 1;

        return [`${firstNumberInStreet}-${secondNumberInStreet}-${thirdNumberInStreet}`];
    }

    return [];
};

const listWinningChoicesOfTriangle = (number) => {
    const availableTriangles = ["0-1-2", "0-2-3"];

    return availableTriangles.filter((triangle) => triangle.indexOf(number) !== -1);
};

const listWinningChoicesOfCorner = (number, neighbors) => {
    if (neighbors) {
        const winningChoices = [];

        if (neighbors.bottomLeft) {
            winningChoices.push(`${neighbors.bottomLeft}-${neighbors.left}-${neighbors.bottom}-${number}`);
        }

        if (neighbors.topLeft) {
            winningChoices.push(`${neighbors.left}-${neighbors.topLeft}-${number}-${neighbors.top}`);
        }

        if (neighbors.bottomRight) {
            winningChoices.push(`${neighbors.bottom}-${number}-${neighbors.bottomRight}-${neighbors.right}`);
        }

        if (neighbors.topRight) {
            winningChoices.push(`${number}-${neighbors.top}-${neighbors.right}-${neighbors.topRight}`);
        }

        return winningChoices;
    }

    return [];
};

const listWinningChoicesOfFourNumbers = (number) => {
    const tetrad = [0, 1, 2, 3];

    return tetrad.includes(number) ? [tetrad.join("-")] : [];
};

const listWinningChoicesOfLine = (number, neighbors) => {
    if (neighbors) {
        const street = listWinningChoicesOfStreet(number)[0];
        const result = [];

        if (neighbors.left) {
            const leftStreet = listWinningChoicesOfStreet(neighbors.left)[0];

            result.push(`${leftStreet}-${street}`);
        }

        if (neighbors.right) {
            const rightStreet = listWinningChoicesOfStreet(neighbors.right)[0];

            result.push(`${street}-${rightStreet}`);
        }

        return result;
    }

    return [];
};

const listWinningChoicesOfColumn = (number) => {
    if (number > 0) {
        const position = getPosition(number);

        return [(position.y + 1).toString()];
    }

    return [];
};

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

const listWinningChoicesOfBigSmall = (number) => {
    if (number !== 0) {
        return number <= 18 ? ["small"] : ["big"];
    }

    return [];
};

const zero = (betAmount) => ({
    split: {
        "0-3": betAmount,
        "12-15": betAmount,
        "32-35": betAmount,
    },
    straightUp: {
        26: betAmount,
    },
});

const voisinsDuZero = (betAmount) => ({
    split: {
        "4-7": betAmount,
        "12-15": betAmount,
        "18-21": betAmount,
        "32-35": betAmount,
        "19-22": betAmount,
    },
    triangle: {
        "0-2-3": betAmount * 2,
    },
    corner: {
        "25-26-28-29": betAmount * 2,
    },
});

const tiers = (betAmount) => ({
    split: {
        "5-8": betAmount,
        "10-11": betAmount,
        "13-16": betAmount,
        "23-24": betAmount,
        "27-30": betAmount,
        "33-36": betAmount,
    },
});

const orphelins = (betAmount) => ({
    split: {
        "6-9": betAmount,
        "14-17": betAmount,
        "17-20": betAmount,
        "31-34": betAmount,
    },
    straightUp: {
        1: betAmount,
    },
});

const neighbors = (betAmount, number) => {
    const neighborsArray = [
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8,
        23, 10,
    ];
    const length = neighborsArray.length;

    const index = neighborsArray.findIndex((x) => x === number);
    const previousIndex = index > 0 ? index - 1 : length - 1;
    const nextIndex = index < length - 1 ? index + 1 : 0;

    return {
        straightUp: {
            [neighborsArray[previousIndex > 0 ? previousIndex - 1 : length - 1].toString()]: betAmount,
            [neighborsArray[previousIndex].toString()]: betAmount,
            [neighborsArray[index].toString()]: betAmount,
            [neighborsArray[nextIndex].toString()]: betAmount,
            [neighborsArray[nextIndex < length - 1 ? nextIndex + 1 : 0].toString()]: betAmount,
        },
    };
};

export const generateChoiceByNumber = (number) => {
    const neighbors = number > 0 ? getNeighbors(number) : null;

    return {
        straightUp: listWinningChoicesOfStraightUp(number),
        split: listWinningChoicesOfSplit(number, neighbors),
        street: listWinningChoicesOfStreet(number),
        triangle: listWinningChoicesOfTriangle(number),
        corner: listWinningChoicesOfCorner(number, neighbors),
        fourNumbers: listWinningChoicesOfFourNumbers(number),
        line: listWinningChoicesOfLine(number, neighbors),
        column: listWinningChoicesOfColumn(number),
        dozen: listWinningChoicesOfDozen(number),
        redBlack: listWinningChoicesOfRedBlack(number),
        oddEven: listWinningChoicesOfOddEven(number),
        bigSmall: listWinningChoicesOfBigSmall(number),
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

export const trackBetChoices = (tracks, betChoices, rate, reduce = false) => {
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

export const quickBets = {
    zero,
    voisinsDuZero,
    tiers,
    orphelins,
    neighbors,
};
