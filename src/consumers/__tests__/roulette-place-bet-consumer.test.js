import RoulettePlaceBetConsumer from "../roulette-place-bet-consumer";
import { Table } from "sc-game-base";
import gameSettings from "../../game-settings";
import { generateResult, getSettlementResult } from "../../helpers/result-helper";
import { helpers } from "sc-common";

const currencyGroupGame = {
    enabled: true,
    minBet: 1,
    maxBet: 2000,
    maxBetPerChoices: {
        straightUp: 200,
        split: 400,
        street: 600,
        triangle: 600,
        corner: 800,
        fourNumbers: 800,
        line: 1000,
        column: 2000,
        dozen: 2000,
        redBlack: 2000,
        oddEven: 2000,
        bigSmall: 2000,
    },
};

const gameConfigs = {
    enabled: true,
};

const gameData = new Table.TableGameData(gameSettings.durations.wholeRound);
gameData.currencyGroupGames = [
    {
        groupId: "g1",
        ...currencyGroupGame,
    },
];
gameData.gameConfigs = gameConfigs;

function initPlaceBetConsumer(definition, gameData) {
    return new RoulettePlaceBetConsumer(definition, gameData);
}

describe("composeBetChoiceValidationCriteria", () => {
    const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

    it("invalid bet type - should return true", () => {
        const consumer = initPlaceBetConsumer(definition, gameData);
        const result = consumer.composeBetChoiceValidationCriteria({ straightUps: { 3: 1 } });
        expect(result[0].failure).toBeTrue();
    });

    it("invalid bet choice - should return true", () => {
        const consumer = initPlaceBetConsumer(definition, gameData);
        const result = consumer.composeBetChoiceValidationCriteria({ straightUp: { 38: 1 } });
        expect(result[0].failure).toBeTrue();
    });

    it("valid bet choice - should return false", () => {
        const consumer = initPlaceBetConsumer(definition, gameData);
        const result = consumer.composeBetChoiceValidationCriteria({ straightUp: { 2: 1 } });
        expect(result[0].failure).toBeFalse();
    });
});

describe("adjustBetTracks test", () => {
    const testCases = [
        [{}, { betChoices: { straightUp: { 20: 10 } } }, { straightUp: { 20: 10 } }],
        [{ bigSmall: { big: 10 } }, { betChoices: { straightUp: { 20: 10 } } }, { straightUp: { 20: 10 }, bigSmall: { big: 10 } }],
        [{ bigSmall: { big: 10 } }, { betChoices: { bigSmall: { big: 10 } } }, { bigSmall: { big: 20 } }],
    ];

    it.each(testCases)("should update betTracks correctly", (betTracks, bet, expectedBetTracks) => {
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);
        gameData.ingame.player = {
            betTracks,
        };
        const consumer = initPlaceBetConsumer(definition, gameData);

        consumer.adjustBetTracks("player", bet);
        expect(betTracks).toEqual(expectedBetTracks);
    });
});

describe("composeBettingTimeValidationCriteria tests", () => {
    it("remaining is bigger than place bet time, return result containing cannotPlaceBet", () => {
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        gameData.remainingTime = definition.durations.placingBets + 1;
        const consumer = initPlaceBetConsumer(definition, gameData);

        const result = consumer.composeBettingTimeValidationCriteria();
        expect(result).toContainEqual({ failure: true, notice: consumer.getNoticeObj(helpers.noticeHelper.cannotPlaceBet) });
    });

    it("remaining is less than locking bet time, return result containing  placeBetNextRound", () => {
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        gameData.remainingTime = definition.durations.lockingBet - 1;
        const consumer = initPlaceBetConsumer(definition, gameData);

        const result = consumer.composeBettingTimeValidationCriteria();
        expect(result).toContainEqual({ failure: true, notice: consumer.getNoticeObj(helpers.noticeHelper.placeBetNextRound) });
    });
});

describe("composeBetAmountValidationCriteria tests", () => {
    it("valid bet, all criterons has failure = false", () => {
        const player = {
            profile: {
                minBet: 1,
                maxBet: 2000,
            },
            session: {
                currencyGroupId: "g1",
            },
        };
        const betChoices = {
            straightUp: {
                10: 100,
            },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        const consumer = initPlaceBetConsumer(definition, gameData);

        const result = consumer.composeBetAmountValidationCriteria(player, betChoices, 100, false);
        expect(result.every((x) => !x.failure)).toBeTrue();
    });

    it("invalid bet, at least one criterons has failure = true", () => {
        const player = {
            profile: {
                minBet: 1,
                maxBet: 2000,
            },
            session: {
                currencyGroupId: "g1",
            },
        };
        const betChoices = {
            straightUp: {
                10: -100,
            },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        const consumer = initPlaceBetConsumer(definition, gameData);

        const result = consumer.composeBetAmountValidationCriteria(player, betChoices, -100, false);
        expect(result.some((x) => x.failure)).toBeTrue();
    });
});

describe("composeHedgeBetValidationCriteria tests", () => {
    it("valid bet, criteria has failure = false", () => {
        const player = {
            profile: {
                name: "player",
                minBet: 1,
                maxBet: 2000,
            },
        };
        const betChoices = {
            bigSmall: { big: 5 },
            straightUp: {
                10: 100,
            },
        };
        const userBetTracks = {
            bigSmall: { big: 10 },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);
        const consumer = initPlaceBetConsumer(definition, { ...gameData, ingame: { [player.profile.name]: { betTracks: userBetTracks } } });

        const result = consumer.composeHedgeBetValidationCriteria(betChoices, player);

        expect(result.every((x) => !x.failure)).toBeTrue();
    });

    it("invalid bet, criteria has failure = true", () => {
        const player = {
            profile: {
                name: "player",
                minBet: 1,
                maxBet: 2000,
            },
        };
        const betChoices = {
            bigSmall: { big: 5 },
            straightUp: {
                10: 100,
            },
        };
        const userBetTracks = {
            bigSmall: { small: 10 },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);
        const consumer = initPlaceBetConsumer(definition, { ...gameData, ingame: { [player.profile.name]: { betTracks: userBetTracks } } });

        const result = consumer.composeHedgeBetValidationCriteria(betChoices, player);

        expect(result).toStrictEqual([
            {
                failure: true,
                notice: { errorCode: "SB1939", hedgeBetGroup: ["small", "big"] },
            },
        ]);
    });
});

describe("consume tests", () => {
    it("validateBetRequest return true, should push bet to queue", () => {
        const player = {
            profile: {
                name: "player",
                minBet: 1,
                maxBet: 2000,
            },
            session: {
                currencyGroupId: "g1",
            },
        };
        const payload = {
            betChoices: {
                straightUp: {
                    10: 100,
                },
            },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        gameData.remainingTime = definition.durations.placingBets - 1;
        const publisher = { publishToUser: jest.fn() };

        const consumer = initPlaceBetConsumer(definition, gameData);
        consumer.publisher = publisher;

        consumer.consume(player, payload);
        expect(gameData.ingame["player"].betQueue).not.toBeEmpty();
    });

    it("validateBetRequest return false, should return", () => {
        const player = {
            profile: {
                name: "player",
                minBet: 1,
                maxBet: 2000,
            },
            session: {
                currencyGroupId: "g1",
            },
        };
        const payload = {
            betChoices: {
                straightUp: {
                    10: -1,
                },
            },
        };
        const definition = new Table.TableGameDefinition(gameSettings, generateResult, getSettlementResult);

        gameData.remainingTime = definition.durations.placingBets - 1;
        const publisher = { publishToUser: jest.fn() };

        const consumer = initPlaceBetConsumer(definition, gameData);
        consumer.publisher = publisher;

        consumer.consume(player, payload);
        expect(gameData.ingame["player"]).toBeUndefined();
    });
});

afterEach(() => {
    gameData.ingame = {};
});
