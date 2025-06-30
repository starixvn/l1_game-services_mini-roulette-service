import { Table } from "sc-game-base";
import { trackBetChoices, buildBetAmountIncrement } from "../helpers/choice-helper";
import { RouletteBet, RouletteBetLog } from "../types";

export default class RouletteProcessBetQueue extends Table.Crons.TableProcessBetQueue {
    decreaseBetTracks(playerName: string, bet: any) {
        this.adjustBetTracks(playerName, bet, true);
    }

    async upsertBet(player: any, roundId: number, bet: any, rate: number) {
        const configs = this.gameData.gameConfigs;
        const newBet: RouletteBet = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            odds: configs.odds,
            freeBet: bet.freeBet,
            roundId,
        };
        const existingBetFilter = { uid: player.UID, roundId, freeBet: bet.freeBet };
        const existingBetIncrement = { ...buildBetAmountIncrement(bet.betChoices), totalAmount: bet.amount };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;
            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
        }

        await this.betsRepository.updateOne(
            existingBetFilter,
            { $inc: existingBetIncrement, $setOnInsert: newBet },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    async insertBetLog(player: any, roundId: number, bet: any, rate: number) {
        const newBetLog: RouletteBetLog = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            freeBet: bet.freeBet,
            ...bet.betChoices,
            roundId,
            clientSentTime: bet.clientSentTime,
            receivedTime: bet.receivedTime,
        };

        if (player.session) {
            newBetLog.siteId = player.session.siteId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;
            newBetLog.operatorId = player.session.operatorId;
            newBetLog.playerId = player.session.playerId;
        }

        await this.betLogsRepository.create(newBetLog);
    }

    adjustTotalBets(player: any, bet: any, rate: number) {
        const totalBets = this.gameData.totalBets;

        trackBetChoices(totalBets, bet.betChoices, rate);
    }

    formatApiBetInfo(payload: any) {
        return {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: this.gameData.roundId,
            freeBet: payload.freeBet,
            clientSentTime: payload.time ?? new Date(),
        };
    }

    generatePlacingBetResult(player: any, balance: any, bet: any, rate: number) {
        const { betChoices, amount } = bet;
        const ownBet = super.generatePlacingBetResult(player, balance, bet, rate) as any;

        ownBet.ownChip = { betChoices, amount };

        return ownBet;
    }

    updateGameDataChips(bet: any, rate: number) {
        const { betChoices } = bet;

        if (!this.gameData.chips[rate]) {
            this.gameData.chips[rate] = {};
        }

        const chipRate = this.gameData.chips[rate];

        Object.entries(betChoices).forEach(([typeOfBets, choicesPerType]) => {
            if (!chipRate[typeOfBets]) {
                chipRate[typeOfBets] = {};
            }
            const trackChoicesPerType = chipRate[typeOfBets];

            Object.entries(choicesPerType as Record<string, number>).forEach(([betChoice, choiceAmount]) => {
                trackChoicesPerType[betChoice] = trackChoicesPerType[betChoice] ?? {};
                trackChoicesPerType[betChoice][choiceAmount] = (trackChoicesPerType[betChoice][choiceAmount] || 0) + 1;
            });
        });
    }

    adjustBetTracks = (playerName: string, bet: any, reduce = false) => {
        if (this.gameData.ingame?.[playerName]) {
            const { betTracks } = this.gameData.ingame[playerName];

            trackBetChoices(betTracks, bet.betChoices, 1, reduce);
        }
    };

    adjustOwnBets(playerName: string, bet: any) {
        if (this.gameData.ingame?.[playerName]) {
            const playerInGame = this.gameData.ingame[playerName];

            playerInGame.ownBets = playerInGame.ownBets ?? {};

            trackBetChoices(playerInGame.ownBets, bet.betChoices, 1);
        }
    }
}
