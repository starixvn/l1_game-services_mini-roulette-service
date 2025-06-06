import { Table } from "sc-game-base";
import gameSettings from "../../game-settings";
import { generateResult, getSettlementResult } from "../../helpers/result-helper";
import SettleGameRoundConsumer from "../roulette-settle-game-round-consumer";

const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);
const gameData = new Table.TableGameData(gameSettings.durations.wholeRound);
const odds = {
    straightUp: 36,
    split: 18,
    street: 12,
    triangle: 12,
    corner: 9,
    fourNumbers: 9,
    line: 6,
    column: 3,
    dozen: 3,
    redBlack: 2,
    oddEven: 2,
    bigSmall: 2,
};
describe("calculateBetResult test", () => {
    const settlementResut = {
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
    };

    const testCases = [
        [
            {
                straightUp: {
                    22: 1,
                },
            },
            {
                totalBetAmount: 1,
                totalWin: 1 * odds.straightUp,
                netWin: 35,
                totalLost: 0,
                winningByChoices: {
                    straightUp: {
                        22: 36,
                    },
                },
            },
        ],
        [
            {
                straightUp: {
                    23: 20,
                },
            },
            {
                totalBetAmount: 20,
                totalWin: 0,
                netWin: 0,
                totalLost: 20,
                winningByChoices: {},
            },
        ],
        [
            {
                straightUp: {
                    23: 20,
                },
                bigSmall: {
                    big: 10,
                },
            },
            {
                totalBetAmount: 30,
                totalWin: 20,
                netWin: 10,
                totalLost: 20,
                winningByChoices: {
                    bigSmall: {
                        big: 20,
                    },
                },
            },
        ],
    ];
    it.each(testCases)("should calculate bet result correctly", (bet, expectedBetResult) => {
        const consumer = new SettleGameRoundConsumer(definition, gameData);
        const betResult = consumer.calculateBetResult(settlementResut, bet, odds);
        expect(betResult).toEqual(expectedBetResult);
    });
});
