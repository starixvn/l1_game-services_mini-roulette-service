import { helpers } from "sc-common";
import { PlaceBetConsumer } from "sc-game-base/src/core/event-consumers";
import notices from "../constants/notices";

export default class RoulettePlaceBetConsumer extends PlaceBetConsumer {
    composeValidationCriteria(player, betChoice, amount, freeBet, roundId) {
        const criteria = super.composeValidationCriteria(player, betChoice, amount, freeBet, roundId);
        return this.composeBetCriteria(player.profile.name).concat(criteria);
    }

    composeBetCriteria(playerName) {
        return [
            {
                failure: this.gameData.ingame?.[playerName]?.betQueue.length > 0,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
        ];
    }

    composeBettingTimeValidationCriteria() {
        const configs = this.gameData.gameConfigs;
        return [
            {
                failure: !configs.enabled,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
        ];
    }

    composeBetAmountValidationCriteria(player, betChoices, totalAmount, freeBet) {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
        const configs = this.gameData.gameConfigs;
        const minBet = Math.max(player.profile.minBet, settings.minBet);
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: this.anyChoiceExceedItsMaxBet(betChoices, settings, player.profile.maxBet),
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

    composeBetChoiceValidationCriteria(betChoices) {
        const validChoices = this.definition.choices.choicesGroupByType;

        return [
            {
                failure: this.anyInvalidChoice(betChoices, validChoices),
                notice: this.getNoticeObj(notices.invalidBetChoice),
            },
        ];
    }

    composeHedgeBetValidationCriteria(betChoices, player) {
        return [];
    }

    consume(player, payload) {
        Object.assign(payload, {
            amount: this.calculateTotalAmount(payload.betChoices),
            freeBet: payload.freeBet ?? false,
        });

        const { amount, betChoices, freeBet } = payload;
        const name = player.profile.name;

        if (!this.validateBetRequest(player, betChoices, amount, freeBet)) {
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

    calculateTotalAmount(betChoices) {
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

    anyInvalidChoice(betChoices, validBetChoices) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const validBetChoicesPerType = validBetChoices[typeOfBets];

            if (!validBetChoicesPerType) {
                return true;
            }

            return Object.keys(choicesPerType).some((betChoice) => !validBetChoicesPerType.includes(betChoice));
        });
    }

    anyChoiceExceedItsMaxBet(betChoices, configs, userMaxBet) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const maxBetPerChoice = Math.min(userMaxBet, configs.maxBetPerChoices[typeOfBets] ?? 0);
            return Object.values(choicesPerType).some((amount) => amount > maxBetPerChoice);
        });
    }

    anyChoiceBelowMinBet(betChoices, minBet) {
        return Object.values(betChoices).some((choicesPerType) => Object.values(choicesPerType).some((amount) => amount < minBet));
    }
}
