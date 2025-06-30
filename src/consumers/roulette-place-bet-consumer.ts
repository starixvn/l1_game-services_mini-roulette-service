import { helpers } from "sc-common";
import { PlaceBetConsumer } from "sc-game-base/src/core/event-consumers";
import notices from "../constants/notices";
import RouletteGameDefinition from "../roulette-game-definition";

export default class RoulettePlaceBetConsumer extends PlaceBetConsumer {
    declare definition: RouletteGameDefinition;
    override composeValidationCriteria(player: any, betChoice: any, amount: number, freeBet: boolean, roundId: number) {
        const criteria = super.composeValidationCriteria(player, betChoice, amount, freeBet, roundId);
        return this.composeBetCriteria(player.profile.name).concat(criteria);
    }

    composeBetCriteria(playerName: string) {
        return [
            {
                failure: this.gameData.ingame?.[playerName]?.betQueue.length > 0,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
        ];
    }

    composeBettingTimeValidationCriteria(_: number) {
        const configs = this.gameData.gameConfigs;
        return [
            {
                failure: !configs.enabled,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
        ];
    }

    composeBetAmountValidationCriteria(player: any, betChoices: any, totalAmount: number, freeBet: boolean) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
        const configs = this.gameData.gameConfigs;
        const minBet = Math.max(player.profile.minBet, settings?.minBet ?? 0);
        const maxBet = Math.min(player.profile.maxBet, settings?.maxBet ?? 0);

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: this.anyChoiceExceedItsMaxBet(betChoices, settings as any, player.profile.maxBet),
                notice: this.getNoticeObj(notices.maxBetOfAnyChoiceReached),
            },
            {
                failure: this.anyChoiceBelowMinBet(betChoices, minBet),
                notice: this.getNoticeObj(notices.betAmountOfAnyChoiceIncorrect),
            },
            {
                failure: totalAmount < minBet,
                notice: this.getNoticeObj(helpers.noticeHelper.minBet, { minBet }),
            },
            {
                failure: totalAmount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
        ];
    }

    composeBetChoiceValidationCriteria(betChoices: any) {
        const validChoices = (this.definition.choices as any).choicesGroupByType;

        return [
            {
                failure: this.anyInvalidChoice(betChoices, validChoices),
                notice: this.getNoticeObj(notices.invalidBetChoice),
            },
        ];
    }

    composeHedgeBetValidationCriteria(betChoices: any, player: any) {
        return [];
    }

    consume(player: any, payload: any) {
        Object.assign(payload, {
            amount: this.calculateTotalAmount(payload.betChoices),
            freeBet: payload.freeBet ?? false,
            receivedTime: new Date(),
        });

        const { amount, betChoices, freeBet } = payload;
        const name = player.profile.name;

        if (!this.validateBetRequest(player, betChoices, amount, freeBet, 0)) {
            return;
        }

        if (!this.gameData.ingame[name]) {
            const newPlayer = {
                name: player.profile.name,
                currency: player.session.currencyName,
                system: player.session.system,
                betTracks: {},
                betQueue: [],

                operatorId: player.session.operatorId,
            };

            this.gameData.ingame[name] = newPlayer;
        }
        this.gameData.ingame[name].betQueue.push({ player, payload });
    }

    calculateTotalAmount(betChoices: Record<string, Record<string, number>>) {
        return Object.entries(betChoices).reduce((previousTotalAmount, [typeOfBets, choicesPerType]) => {
            if (choicesPerType) {
                const totalAmountPerType = Object.entries(choicesPerType).reduce((previousTotalAmountPerType, [betChoice, amount]) => {
                    betChoices[typeOfBets][betChoice] = amount = amount >> 0;

                    return previousTotalAmountPerType + amount;
                }, 0);

                return previousTotalAmount + totalAmountPerType;
            }

            return previousTotalAmount;
        }, 0);
    }

    anyInvalidChoice(betChoices: Record<string, Record<string, number>>, validBetChoices: Record<string, string[]>) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const validBetChoicesPerType = validBetChoices[typeOfBets];
            if (!validBetChoicesPerType) {
                return true;
            }

            return Object.keys(choicesPerType).some((betChoice) => !validBetChoicesPerType.includes(betChoice));
        });
    }

    anyChoiceExceedItsMaxBet(
        betChoices: Record<string, Record<string, number>>,
        configs: { maxBetPerChoices: Record<string, number> },
        userMaxBet: number
    ) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const maxBetPerChoice = Math.min(userMaxBet, configs?.maxBetPerChoices?.[typeOfBets] ?? 0);
            return Object.values(choicesPerType).some((amount) => amount > maxBetPerChoice);
        });
    }

    anyChoiceBelowMinBet(betChoices: Record<string, Record<string, number>>, minBet: number) {
        return Object.values(betChoices).some((choicesPerType) => Object.values(choicesPerType).some((amount) => amount < minBet));
    }
}
