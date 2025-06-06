import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import gameSettings from "../../game-settings";
import { Table } from "sc-game-base";
import RouletteBot from "../roulette-bot";
import BaseEventPublishers from "sc-game-base/src/core/event-publishers/base-event-publisher";
import appConfigs from "../../app-configs";

jest.mock("sc-game-base/src/core/event-publishers/base-event-publisher");

const definition = new Table.TableGameDefinition(gameSettings);
const gameData = new Table.TableGameData(gameSettings.durations.placingBets - 1);
gameData.gameConfigs = {
    enabled: true,
    minbet: 1,
    maxbet: 2000,
    bot_maxbet: 1000,
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
    odds: {
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
    },
};
const publisher = new BaseEventPublishers(definition.name, gameData);

/** @type {mongoose.Model}*/
const userInfosRepository = {
    findOneAndUpdate: () => ({
        lean: () => ({}),
    }),
};

/** @type {mongoose.Model}*/
const tempBetsRepository = stubMongooseModelStupidly(mongoose.Model);
tempBetsRepository.updateOne = jest.fn();

describe("reset tests", () => {
    it("should call resetAllBotData when botenabled is false", async () => {
        gameData.gameConfigs.botenabled = false;
        const bot = new RouletteBot(definition, gameData, publisher, userInfosRepository, tempBetsRepository, appConfigs);
        jest.spyOn(bot, "resetAllBotData");

        await bot.reset();

        expect(bot.resetAllBotData).toHaveBeenCalled();
        gameData.gameConfigs.botenabled = true;
    });
});

describe("place bet tests", () => {
    it("should call publishToAllUsers, update bot's betTracks when bet is successful", async () => {
        const bot = new RouletteBot(definition, gameData, publisher, userInfosRepository, tempBetsRepository, appConfigs);
        tempBetsRepository
            .findOne()
            .lean()
            .exec.mockReturnValueOnce({ uid: 1, straightUp: { 10: 10 } });
        const botPlayer = { id: 1, choices: [], betOnChoices: {}, remainTickets: 1 };
        await bot.placeBet(botPlayer);

        expect(publisher.publishToAllUsers).toHaveBeenCalled();
        expect(botPlayer.choices).not.toBeEmpty();
        expect(botPlayer.remainTickets).toEqual(0);
        expect(gameData.totalBets).not.toBeEmpty();
    });
});

describe("get bet choice tests", () => {
    it("should not choose straightUp or split choice when total bet is greater than raito", () => {
        const bot = new RouletteBot(definition, gameData, publisher, userInfosRepository, tempBetsRepository, appConfigs);
        bot.resetAllBets();
        bot.allBets.straightUp = { 10: 100 };
        const botPlayer = { id: 1, choices: [], betOnChoices: {}, remainTickets: 1 };

        const choice = bot.getBetChoice(botPlayer);
        expect(Object.keys(choice)).not.toContainAllValues(["straightUp", "split"]);
    });
});

describe("getQuickBets tests", () => {
    it("should return quick bet succesfully", () => {
        const bot = new RouletteBot(definition, gameData, publisher, userInfosRepository, tempBetsRepository, appConfigs);
        const quickBet = bot.getQuickBets(2);
        expect(quickBet).not.toBeEmpty();
    });
});
