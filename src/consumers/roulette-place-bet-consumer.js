import { helpers } from "sc-common";
import { PlaceBetConsumer } from "sc-game-base/src/core/event-consumers";
import notices from "../constants/notices";

const HedgeBetGroupByType = {
    oddEven: ["even", "odd"],
    redBlack: ["red", "black"],
};

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
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const totalAmountOfExistingBets = this.calculateTotalAmount(betTracks);
        const minBet = Math.max(player.profile.minBet, settings.minBet);
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: this.anyChoiceExceedItsMaxBet(betChoices, betTracks, settings, player.profile.maxBet),
                notice: this.getNoticeObj(notices.maxBetOfAnyChoiceReached),
            },
            {
                failure: this.anyChoiceBelowMinBet(betChoices, betTracks, minBet),
                notice: this.getNoticeObj(notices.betAmountOfAnyChoiceIncorrect),
            },
            {
                failure: totalAmountOfExistingBets + totalAmount < minBet,
                notice: this.getNoticeObj(helpers.noticeHelper.minBet, { minBet }),
            },
            {
                failure: totalAmount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
            {
                failure: totalAmountOfExistingBets + totalAmount > maxBet,
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
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        let hedgeBetType = "";

        Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
            const trackChoicesPerType = betTracks[typeOfBets] || {};
            const isOnHedgeBetGroup = this.definition.hedgeBetGroups.some((group) => group === typeOfBets);

            if (isOnHedgeBetGroup) {
                const setOfUniqueBetChoice = new Set([...Object.keys(trackChoicesPerType ?? {}), ...Object.keys(choicesPerType ?? {})]);

                setOfUniqueBetChoice.size > 1 && (hedgeBetType = typeOfBets);
            }
        });

        return [
            {
                failure: !!hedgeBetType,
                notice: this.getNoticeObj(helpers.noticeHelper.disallowHedgeBet, {
                    hedgeBetGroup: HedgeBetGroupByType[hedgeBetType],
                }),
            },
        ];
    }

    consume(player, payload) {
        Object.assign(payload, {
            amount: this.calculateTotalAmount(payload.betChoices) >> 0,
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

        this.adjustBetTracks(player.profile.name, payload);
        this.gameData.ingame[name].betQueue.push({ player, payload });
    }

    adjustBetTracks(playerName, bet) {
        const { betChoices } = bet;

        if (this.gameData.ingame?.[playerName]) {
            const playerInGame = this.gameData.ingame[playerName];

            Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
                const trackChoicesPerType = playerInGame.betTracks[typeOfBets] || {};

                Object.entries(choicesPerType).forEach(([betChoice, amount]) => {
                    trackChoicesPerType[betChoice] = (trackChoicesPerType[betChoice] || 0) + amount;
                });

                if (!playerInGame.betTracks[typeOfBets]) {
                    playerInGame.betTracks[typeOfBets] = trackChoicesPerType;
                }
            });
        }
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

    anyChoiceExceedItsMaxBet(betChoices, betTracks, configs, userMaxBet) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const maxBetPerChoice = Math.min(userMaxBet, configs.maxBetPerChoices[typeOfBets] ?? 0);

            return Object.entries(choicesPerType).some(([betChoice, amount]) => {
                const currentBetAmount = betTracks[typeOfBets]?.[betChoice] ?? 0;

                return amount > maxBetPerChoice || currentBetAmount + amount > maxBetPerChoice;
            });
        });
    }

    anyChoiceBelowMinBet(betChoices, betTracks, minBet) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            return Object.entries(choicesPerType).some(([betChoice, amount]) => {
                const currentBetAmount = betTracks[typeOfBets]?.[betChoice] ?? 0;

                return currentBetAmount + amount < minBet || amount < minBet;
            });
        });
    }
}
