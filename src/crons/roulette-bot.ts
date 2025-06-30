import mongoose from "mongoose";
import { Core, Table } from "sc-game-base";
import Chance from "chance";
import { buildBetAmountIncrement, trackBetChoices } from "../helpers/choice-helper";
import RouletteGameDefinition from "../roulette-game-definition";
import { RouletteGameData } from "../roulette-game-data";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { RouletteBet } from "../types";
import Constants from "../constants";

export default class RouletteBot extends Table.Crons.TableGameConfigBot {
    declare gameData: RouletteGameData;
    appConfigs: any;
    betChoiceRatios: Record<string, number>;
    betOptions: string[];
    betChoices: Record<string, string[]>;

    constructor(
        definition: RouletteGameDefinition,
        gameData: RouletteGameData,
        publisher: Core.BaseEventPublishers.BaseEventPublisher,
        gameManagementApiClientFactory: GameManagementApiClientFactory,
        tempBetsRepository: mongoose.Model<RouletteBet>,
        appConfigs: any
    ) {
        super(definition, gameData, publisher, gameManagementApiClientFactory, tempBetsRepository);
        this.appConfigs = appConfigs;

        this.betOptions = [
            Constants.betTypes.oddEven,
            Constants.betTypes.redBlack,
            Constants.betTypes.straightUp,
            Constants.betTypes.dozen,
        ];
        this.betChoiceRatios = {
            straightUpSplit: 60,
            others: 40,
        };

        this.betChoices = {
            oddEven: ["even", "odd"],
            redBlack: ["red", "black"],
            straightUp: Array.from({ length: 37 }, (_, i) => i.toString()),
            dozen: ["1", "2", "3"],
        };
    }

    async run() {
        if (this.gameData.gameConfigs?.botenabled && this.isDuringBetTime()) {
            const random = this.chance.integer({ min: 0, max: 5 });

            if (this.shouldAddBot(random)) {
                await this.joinRoom();
            }

            if (this.shouldRemoveBot(random)) {
                await this.leaveRoom();
            }

            const botsToBet = this.getBotsToBet();

            botsToBet.length > 0 && (await this.placeBets(botsToBet));
        }
    }

    getBetChoice(bot: any) {
        const betType = super.getBetChoice(bot) as unknown as string;
        const betChoices = this.betChoices[betType];
        const chance = new Chance();
        return { [betType]: chance.pickone(betChoices) };
    }

    generateClientSeed() {
        return "";
    }

    async insertOrUpdateBet(bot: any, choice: any, amount: number, currentBet: any) {
        const betChoices = this.convertChoiceToRecord(choice, amount);
        const existingBetIncrement = { ...buildBetAmountIncrement(betChoices), totalAmount: amount };

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

    updateTotalBetsAndChips(choice: any, amount: number) {
        const trackTotalBets = this.gameData.totalBets;

        const betChoices = this.convertChoiceToRecord(choice, amount);
        trackBetChoices(trackTotalBets, betChoices, this.botRate);

        if (!this.gameData.chips[this.botRate]) {
            this.gameData.chips[this.botRate] = {};
        }

        const chipBotRate = this.gameData.chips[this.botRate];

        Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
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

    private convertChoiceToRecord(choice: any, amount: number) {
        return Object.keys(choice).reduce((acc, betType) => {
            acc[betType] = { [choice[betType] as string]: amount };
            return acc;
        }, {} as Record<string, Record<string, number>>);
    }

    updateBotInRoomData(bot: any, choice: any, amount: number, balance: number) {
        bot.totalBet += amount;
        bot.red = balance;
        bot.remainTickets--;
        this.allBets[choice] = this.allBets[choice] ? this.allBets[choice] + amount : amount;
        this.smallTickets += amount <= this.getMinBet() * 50 ? 1 : 0;
    }

    generatePlaceBetPayload(playerId: string, choice: any, amount: number, balance: number) {
        const betChoices = this.convertChoiceToRecord(choice, amount);
        return {
            playerChip: { playerId, betChoices, amount, red: balance },
        };
    }

    getTotalBetAmount(bet: any) {
        let totalBet = 0;

        if (bet) {
            this.betOptions.forEach((choiceType) => {
                bet[choiceType] &&
                    (totalBet += Object.values(bet[choiceType] as Record<string, number>)?.reduce((acc, curr) => acc + curr, 0) ?? 0);
            });
        }

        return totalBet;
    }
}
