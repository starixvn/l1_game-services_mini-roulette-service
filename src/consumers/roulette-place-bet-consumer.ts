import { helpers } from "sc-common";
import { PlaceBetConsumer } from "sc-game-base/src/core/event-consumers";
import notices from "../constants/notices";
import RouletteGameDefinition from "../roulette-game-definition";

export default class RoulettePlaceBetConsumer extends PlaceBetConsumer {
    declare definition: RouletteGameDefinition;

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
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const totalAmountOfExistingBets = this.calculateTotalAmount(betTracks);
        const minBet = Math.max(player.profile.minBet, settings?.minBet ?? 0);
        const maxBet = Math.min(player.profile.maxBet, settings?.maxBet ?? 0);

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: this.anyChoiceExceedItsMaxBet(betChoices, betTracks, settings as any, player.profile.maxBet),
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
                failure: totalAmount < minBet,
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

    composeBetChoiceValidationCriteria(betChoices: any) {
        const validChoices = (this.definition.choices as any).choicesGroupByType;

        return [
            {
                failure: Object.keys(betChoices).length === 0,
                notice: this.getNoticeObj(notices.invalidBetChoice),
            },
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
                roundId: 0,
                betStartTime: new Date(),
                operatorId: player.session.operatorId,
            };

            this.gameData.ingame[name] = newPlayer;
        }
        this.adjustBetTracks(player.profile.name, payload);
        this.gameData.ingame[name].betQueue.push({ player, payload });
    }

    adjustBetTracks(playerName: string, bet: any) {
        const { betChoices }: { betChoices: Record<string, Record<string, number>> } = bet;

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
        betTracks: Record<string, Record<string, number>>,
        configs: { maxBetPerChoices: Record<string, number> },
        userMaxBet: number
    ) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            const maxBetPerChoice = Math.min(userMaxBet, configs?.maxBetPerChoices?.[typeOfBets] ?? 0);
            return Object.entries(choicesPerType).some(([betChoice, amount]) => {
                const currentBetAmount = betTracks[typeOfBets]?.[betChoice] ?? 0;
                return amount > maxBetPerChoice || currentBetAmount + amount > maxBetPerChoice;
            });
        });
    }

    anyChoiceBelowMinBet(
        betChoices: Record<string, Record<string, number>>,
        betTracks: Record<string, Record<string, number>>,
        minBet: number
    ) {
        return Object.entries(betChoices).some(([typeOfBets, choicesPerType]) => {
            return Object.entries(choicesPerType).some(([betChoice, amount]) => {
                const currentBetAmount = betTracks[typeOfBets]?.[betChoice] ?? 0;
                return amount < minBet || currentBetAmount + amount < minBet;
            });
        });
    }
}
