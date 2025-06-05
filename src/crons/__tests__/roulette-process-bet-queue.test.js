import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import logger from "sc-common/logger";
import { Table } from "sc-game-base";
import { BaseMetrics } from "sc-game-base/src/core/base-metrics";
import { PlaceBetPublisher } from "sc-game-base/src/core/event-publishers";

import gameSettings from "../../game-settings";
import ProcessBetQueue from "../roulette-process-bet-queue";

jest.mock("sc-game-base/src/core/event-publishers");

const definition = new Table.TableGameDefinition(gameSettings);
const gameData = new Table.TableGameData(gameSettings.durations.placingBets - 1);
gameData.gameConfigs = {
    enabled: true,
    minbet: 1,
    maxbet: 2000,
    choices_maxbet: {
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
gameData.exchangeRates = {
    code: {
        US: 1,
    },
};
gameData.currencies = [
    { code: "US", isTest: false },
    { code: "EUR", isTest: false },
    { code: "UUS", isTest: true },
];

const placeBetPublisher = new PlaceBetPublisher(definition.name, gameData);

/** @type {logger}*/
const logService = stub(logger);
/** @type {mongoose.Model}*/
const betsRepository = stubMongooseModelStupidly(mongoose.Model);
betsRepository.updateOne = jest.fn();

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);
betLogsRepository.create = jest.fn();

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);
userInfosRepository.updateOne = jest.fn();

const placeBet = jest.fn();
const baseMetrics = stub(BaseMetrics);

beforeEach(() => {
    gameData.ingame = {
        player01: {
            name: "player01",
            betTracks: { straightUp: { 10: 200 } },
            betQueue: [],
        },
    };
});

describe("proceedBet error tests", () => {
    it("placeBet api return insufficientBalance, should decrease betTrack", async () => {
        placeBet.mockReturnValueOnce({
            isOk: false,
            response: {
                inSufficientBalance: true,
            },
        });

        const proceedBetQueue = initBetQueue();
        const player = mockPlayer();

        await proceedBetQueue.proceedBet(player, mockPayload());
        const { betTracks } = gameData.ingame["player01"];
        expect(betTracks.straightUp[10]).toEqual(100);
    });

    it("placeBet api return kickedOut, should call handleFailedBet,  should decrease betTrack", async () => {
        placeBet.mockReturnValueOnce({
            isOk: false,
            response: {
                kickedOut: true,
            },
        });

        const proceedBetQueue = initBetQueue();
        const player = mockPlayer();
        await proceedBetQueue.proceedBet(player, mockPayload());

        const { betTracks } = gameData.ingame["player01"];
        expect(betTracks.straightUp[10]).toEqual(100);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});

describe("successful bet tests", () => {
    beforeEach(() => {
        gameData.roundId = 1;
    });

    it("place bet successfully, insert new betlog, upsert bet, update total bet and call notifyPlacingBetResult", async () => {
        placeBet.mockReturnValueOnce({ isOk: true, response: {} });
        const proceedBetQueue = initBetQueue();

        const player = mockPlayer();
        await proceedBetQueue.proceedBet(player, mockPayload());

        expect(betLogsRepository.create).toHaveBeenCalled();
        expect(betsRepository.updateOne).toHaveBeenCalled();
        expect(placeBetPublisher.publishSuccessBet).toHaveBeenCalled();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});

const initBetQueue = () => {
    return new ProcessBetQueue({
        definition,
        gameData,
        placeBetPublisher,
        placeBet,
        logService,
        betsRepository,
        betLogsRepository,
        userInfosRepository,
        baseMetrics,
    });
};

const mockPlayer = () => {
    return {
        UID: 1,
        profile: { name: "player01", minBet: 1, maxBet: 5000 },
        session: {
            userId: 1,
            playerId: "1",
            siteId: "123456",
            multiplier: 1,
            currencyCode: "US",
        },
        socketClient: {
            emit: jest.fn(),
        },
    };
};

const mockPayload = (roundId = 1, freeBet = false) => {
    return {
        freeBet,
        amount: 100,
        betChoices: {
            straightUp: {
                10: 100,
            },
        },
        roundId,
    };
};
