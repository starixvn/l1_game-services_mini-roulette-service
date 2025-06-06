import constants from "../../constants";
import { getSettlementResult, generateResult } from "../result-helper";

const chanceMock = { pickoneIndex: 0 };

jest.mock("chance", () => {
    return function () {
        const orig = {
            ...jest.requireActual("chance"),
        };

        return {
            natural: (opt) => {
                return new orig.Chance().natural(opt);
            },
            integer: (opt) => {
                return new orig.Chance().integer(opt);
            },
            pickone: (arr) => arr[chanceMock.pickoneIndex],
        };
    };
});

describe("getSettlementResult tests", () => {
    const testCases = [
        [
            9,
            {
                straightUp: ["9"],
                split: ["6-9", "8-9", "9-12"],
                street: ["7-8-9"],
                triangle: [],
                corner: ["5-6-8-9", "8-9-11-12"],
                fourNumbers: [],
                line: ["4-5-6-7-8-9", "7-8-9-10-11-12"],
                column: ["3"],
                dozen: ["1"],
                redBlack: ["red"],
                oddEven: ["odd"],
                bigSmall: ["small"],
            },
        ],
        [
            3,
            {
                straightUp: ["3"],
                split: ["0-3", "2-3", "3-6"],
                street: ["1-2-3"],
                triangle: ["0-2-3"],
                corner: ["2-3-5-6"],
                fourNumbers: ["0-1-2-3"],
                line: ["1-2-3-4-5-6"],
                column: ["3"],
                dozen: ["1"],
                redBlack: ["red"],
                oddEven: ["odd"],
                bigSmall: ["small"],
            },
        ],
        [
            22,
            {
                straightUp: ["22"],
                split: ["19-22", "22-23", "22-25"],
                street: ["22-23-24"],
                triangle: [],
                corner: ["19-20-22-23", "22-23-25-26"],
                fourNumbers: [],
                line: ["19-20-21-22-23-24", "22-23-24-25-26-27"],
                column: ["1"],
                dozen: ["2"],
                redBlack: ["black"],
                oddEven: ["even"],
                bigSmall: ["big"],
            },
        ],
    ];

    it.each(testCases)("should return correct settlement", (result, settlementResult) => {
        expect(getSettlementResult(result)).toEqual(settlementResult);
    });
});

describe("generateResult tests", () => {
    const testCases = [
        { randomMode: 1, pickoneIndex: 0 },
        { randomMode: 1, pickoneIndex: 1 },
        { randomMode: 2, pickoneIndex: 0 },
        { randomMode: 3, pickoneIndex: 0 },
        { randomMode: 3, pickoneIndex: 1 },
        { randomMode: 4, pickoneIndex: 0 },
    ];

    it.each(testCases)("return correct number", (testCase) => {
        chanceMock.pickoneIndex = testCase.pickoneIndex;
        const result = generateResult(testCase.randomMode);
        expect(result).toBeGreaterThanOrEqual(constants.numberWheel.min);
        expect(result).toBeLessThanOrEqual(constants.numberWheel.max);
    });
});
