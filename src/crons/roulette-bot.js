import mongoose from "mongoose";
import { helpers } from "sc-common";
import { Core, Table } from "sc-game-base";
import Chance from "chance";
import { buildBetAmountIncrement, trackBetChoices, quickBets } from "../helpers/choice-helper";
import constants from "../constants";

export default class RouletteBot extends Table.Crons.TableGameBot {
    /**
     * @param {Table.TableGameDefinition} definition
     * @param {Table.TableGameData} gameData
     * @param {Core.BaseEventPublishers.BaseEventPublisher} publisher
     * @param {mongoose.Model} userInfosRepository
     * @param {mongoose.Model} tempBetsRepository
     */
    constructor(definition, gameData, publisher, userInfosRepository, tempBetsRepository, appConfigs) {
        super(definition, gameData, publisher, userInfosRepository, tempBetsRepository);
        this.appConfigs = appConfigs;

        this.betTypeKeys = [
            "bigSmall",
            "oddEven",
            "redBlack",
            "straightUp",
            "split",
            "street",
            "triangle",
            "corner",
            "fourNumbers",
            "column",
            "line",
            "dozen",
        ];

        this.betChoiceRatios = {
            straightUpSplit: 60,
            others: 40,
        };

        this.uniqueBetTypes = ["bigSmall", "redBlack", "oddEven"];
        this.defaultBotMaxBet = 500;
        this.resetAllBets();
    }

    resetAllBotData() {
        super.resetAllBotData();
        this.resetAllBets();
    }

    resetAllBets() {
        this.allBets = {
            bigSmall: {
                big: 0,
                small: 0,
            },
            oddEven: {
                even: 0,
                odd: 0,
            },
            redBlack: {
                red: 0,
                black: 0,
            },
            straightUp: {},
            split: {},
            street: {},
            triangle: {},
            corner: {},
            fourNumbers: {},
            column: {},
            line: {},
            dozen: {},
        };
    }

    async placeBet(bot) {
        const choice = this.getBetChoice(bot);
        const amount = this.getTotalBetAmount(choice);

        if (this.gameData.remainingTime > this.definition.durations.lockingBet) {
            const currentBet = await this.tempBetsRepository.findOne({ uid: bot.id, roundId: this.gameData.roundId }).lean().exec();
            const totalBetAmount = this.getTotalBetAmount(currentBet);

            if (totalBetAmount + amount <= this.gameData.gameConfigs.bot_maxbet) {
                const user = await this.userInfosRepository
                    .findOneAndUpdate({ id: bot.id, red: { $gt: amount } }, { $inc: { red: -amount } }, { new: true })
                    .lean();

                if (user) {
                    await this.insertOrUpdateBet(bot, choice, amount, currentBet);

                    this.totalTickets += 1;
                    if (this.gameData.players[bot.id]) {
                        this.gameData.players[bot.id].red = user.red;
                    }

                    this.updateTotalBetsAndChips(choice, amount);
                    this.updateBotInRoomData(bot, choice, amount, user.red);
                    this.publisher.publishToAllUsers(this.generatePlaceBetPayload(bot.id, choice, amount, user.red));
                }
            }
        }
    }

    generatePlaceBetPayload(playerId, choice, amount, balance) {
        return {
            playerChip: { playerId, betChoices: choice, amount, red: balance },
        };
    }

    async insertOrUpdateBet(bot, choice, amount, currentBet) {
        const existingBetIncrement = { ...buildBetAmountIncrement(choice), totalAmount: amount };

        const create = {
            uid: bot.id,
            name: bot.name,
            roundId: this.gameData.roundId,
            time: new Date(),
            rate: 1,
            currency: " ",
        };

        await this.tempBetsRepository.updateOne(
            { uid: bot.id, roundId: this.gameData.roundId },
            { $inc: existingBetIncrement, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    updateTotalBetsAndChips(choice, amount) {
        const trackTotalBets = this.gameData.totalBets;

        trackBetChoices(trackTotalBets, choice, this.botRate);

        if (!this.gameData.chips[this.botRate]) {
            this.gameData.chips[this.botRate] = {};
        }

        const chipBotRate = this.gameData.chips[this.botRate];

        Object.entries(choice).forEach(([typeOfBets, choicesPerType]) => {
            if (!chipBotRate[typeOfBets]) {
                chipBotRate[typeOfBets] = {};
            }
            const trackChoicesPerType = chipBotRate[typeOfBets];

            Object.entries(choicesPerType).forEach(([betChoice, choiceAmount]) => {
                trackChoicesPerType[betChoice] = trackChoicesPerType[betChoice] ?? {};
                trackChoicesPerType[betChoice][choiceAmount] = (trackChoicesPerType[betChoice][choiceAmount] || 0) + 1;
            });
        });
    }

    updateBotInRoomData(bot, choice, amount, balance) {
        const trackBotChoices = bot.betOnChoices;

        bot.totalBet += amount;
        bot.choices.push(choice);
        bot.red = balance;
        bot.remainTickets--;
        trackBetChoices(trackBotChoices, choice, this.botRate);
    }

    getBetChoice(bot) {
        const chance = new Chance();
        const randomNumber = chance.integer({ min: constants.numberWheel.min, max: constants.numberWheel.max });
        const totalBotBet = this.getAllBetAmount();
        const options = this.definition.choices.choicesGroupByNumber[randomNumber];
        const betTypes = Object.keys(options).filter((key) => options[key].length > 0);
        const straightUpAndSplitTotalBet = this.getTotalAmountOnType("straightUp") + this.getTotalAmountOnType("split");
        const isStraightUpOrSplit =
            totalBotBet === 0 ? true : (straightUpAndSplitTotalBet * 100) / totalBotBet < this.betChoiceRatios.straightUp;

        let typeChoiceIndex = 0,
            box = {};

        if (isStraightUpOrSplit) {
            if (chance.bool({ likelihood: 30 })) {
                return this.getQuickBets(randomNumber);
            }

            if (randomNumber !== 0) {
                typeChoiceIndex = chance.integer({ min: 0, max: 1 });
            }
        } else {
            typeChoiceIndex = chance.integer({ min: 2, max: betTypes.length - 1 });
        }

        const selectedBetType = betTypes[typeChoiceIndex];
        const betChoices = options[selectedBetType];
        let selectedChoice = betChoices[chance.integer({ min: 0, max: betChoices.length - 1 })];
        box[selectedBetType] = {
            [selectedChoice]: 0,
        };

        if (!!bot && bot.choices.length > 0 && this.uniqueBetTypes.some((type) => type === selectedBetType)) {
            const previousUniqueBox = bot.choices.find((choice) => selectedBetType === Object.keys(choice)[0]);

            if (previousUniqueBox) {
                box = previousUniqueBox;
                selectedChoice = Object.keys(previousUniqueBox[selectedBetType])[0];
            }
        }

        const betAmount = this.getBetAmount(box);
        box[selectedBetType][selectedChoice] = betAmount;

        return box;
    }

    getQuickBets(randomNumber) {
        const chance = new Chance();
        const options = Object.values(quickBets);
        const randomOption = options[chance.integer({ min: 0, max: options.length - 1 })];
        const betAmount = this.convertAmountToChip(
            chance.integer({
                min: this.getMinBet(),
                max: this.appConfigs.maxQuickBets,
            })
        );

        return randomOption(betAmount, randomNumber);
    }

    getBetAmount(box) {
        const gameConfigs = this.gameData.gameConfigs;
        const betTypeChoice = Object.keys(box)[0];
        const configBetTypeOdds = gameConfigs.odds[betTypeChoice];
        const configMaxBetType = gameConfigs.choices_maxbet[betTypeChoice];
        const configBotMaxBet = this.getBotMaxBet();
        const minBet = this.getMinBet();
        const random = helpers.numberHelper.getRandomNumberStep5(minBet, configBotMaxBet, true);
        const betAmount = this.convertAmountToChip(Math.min(Math.ceil(random / configBetTypeOdds), configMaxBetType));

        return betAmount > minBet ? betAmount : minBet;
    }

    getBotMaxBet() {
        const gameConfigs = this.gameData.gameConfigs;

        return gameConfigs && gameConfigs.bot_maxbet > 0 ? gameConfigs.bot_maxbet : this.defaultBotMaxBet;
    }

    getMinBet() {
        const gameConfigs = this.gameData.gameConfigs;

        let minBet = 1;

        if (!!gameConfigs && gameConfigs.minbet > 0) {
            minBet = gameConfigs.minbet;
        }

        return minBet;
    }

    getAllBetAmount() {
        let total = 0;

        this.betTypeKeys.forEach((betType) => {
            total += this.getTotalAmountOnType(betType);
        });

        return total;
    }

    convertAmountToChip(amount) {
        const chipList = this.appConfigs.chips.filter((chip) => amount / chip >= 1);

        return chipList.length > 0 ? chipList[0] : this.getMinBet();
    }

    getTotalBetAmount(currentBet) {
        let total = 0;

        if (currentBet) {
            const betTypes = Object.values(currentBet);
            betTypes.forEach((betType) => {
                Object.values(betType).forEach((value) => (total += value));
            });
        }

        return total;
    }

    getTotalAmountOnType(betType) {
        let total = 0;
        const betOnType = this.allBets[betType];

        Object.keys(betOnType).forEach((choice) => {
            total += betOnType[choice];
        });

        return total;
    }
}
