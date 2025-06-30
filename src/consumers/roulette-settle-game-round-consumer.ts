import mongoose from "mongoose";
import { SettleGameRoundConsumer } from "sc-game-base/src/core/event-consumers";
import RouletteRoundResultConsumer from "./roulette-round-result-consumer";
import { RouletteBet, RouletteRound, SettlementResult } from "../types";
import { RouletteGameData } from "../roulette-game-data";

export default class RouletteSettleGameRoundConsumer extends SettleGameRoundConsumer {
    declare gameData: RouletteGameData;
    declare roundResultConsumer: RouletteRoundResultConsumer;
    constructor(props: any) {
        super(props);
        this.roundResultConsumer = props.roundResultConsumer;
    }

    async settleUnsettledBets() {
        const bets = await this.betsRepository.find({ paid: false }).exec();
        if (bets.length > 0) {
            await Promise.all(
                bets.map(async (bet: mongoose.Document<RouletteBet> & RouletteBet) => {
                    const round = await this.findOrCreateRound(bet);
                    round && (await this.settleBet(bet, round));
                })
            );
        }
    }

    async settleRoundById(roundId: number) {
        const bet = await this.betsRepository.findOne({ roundId, paid: false }).exec();
        const round = await this.findOrCreateRound(bet);
        if (bet && round) {
            await this.settleBet(bet, round);
        }
    }

    async findOrCreateRound(bet: RouletteBet) {
        if (!bet) {
            return null;
        }
        const { roundId, uid } = bet;
        const round = await this.roundsRepository.findOne({ id: roundId }).lean().exec();
        if (round) {
            return round;
        } else {
            const { exchangeRates } = this.gameData;
            const result = await this.roundResultConsumer.generateResult(bet);
            const settlementResult = this.definition.settle(result);
            const newRound = {
                id: roundId,
                result,
                uid,
                settlementResult,
                time: new Date(),
                exchangeRateId: exchangeRates.exId,
            };
            const roundDocument = await this.roundsRepository.create(newRound);
            return roundDocument?.toObject();
        }
    }

    async settleBet(bet: mongoose.Document<RouletteBet> & RouletteBet, round: RouletteRound) {
        const { id, time, result, settlementResult } = round;
        this.userBetResultPublisher.publishToUser(bet.uid, { finish: { result, settlementResult, roundId: id } });

        const odds = bet.odds || this.gameData.gameConfigs.odds;
        const betResult = this.calculateBetResult(settlementResult, bet, odds);

        bet.betwin = betResult.totalWin;
        bet.paid = true;

        await bet.save();
        await this.callEndGame(bet, id, time, betResult);

        this.captureBetResult(bet.uid, betResult, bet.time);
        this.userBetResultPublisher.publish(bet.uid, betResult);
    }

    captureBetResult(uid: string, betResult: { totalBetAmount: number; totalWin: number }, time: Date) {
        // TODO: capture bet result
        const accumulatedDays = this.gameData.guaranteedWinFeature?.accumulatedDays ?? 3;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);
        const oldBetHistory = this.gameData.playerBetHistory?.[uid] || [];
        const newBetHistory = oldBetHistory.filter((bet: any) => bet.time && new Date(bet.time) >= startDate);
        newBetHistory.push({
            totalAmount: betResult.totalBetAmount,
            betwin: betResult.totalWin,
            time,
        });
        this.gameData.playerBetHistory[uid] = newBetHistory;
    }

    calculateBetResult(settlementResult: SettlementResult, bet: RouletteBet, odds: Record<string, number>) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [typeOfBets, winningChoices]) => {
                const choicesPerType = (bet as any)[typeOfBets] as Record<string, number>;
                if (choicesPerType) {
                    const oddsOfType = odds?.[typeOfBets] ?? 0;
                    const winningByChoicesOfType: Record<string, number> = {};

                    Object.entries(choicesPerType).forEach(([betChoice, betAmount]) => {
                        const win = winningChoices.includes(betChoice);
                        const winAmount = win ? betAmount * oddsOfType : 0;

                        result.totalBetAmount += betAmount;
                        result.totalWin += winAmount;

                        if (winAmount > 0) {
                            result.netWin += winAmount - betAmount;
                            winningByChoicesOfType[betChoice] = winAmount;
                        } else {
                            result.totalLost += betAmount;
                        }

                        return result;
                    });

                    if (Object.keys(winningByChoicesOfType).length !== 0) {
                        result.winningByChoices[typeOfBets] = winningByChoicesOfType;
                    }
                }

                return result;
            },
            {
                totalBetAmount: 0,
                totalWin: 0,
                netWin: 0,
                totalLost: 0,
                winningByChoices: {} as Record<string, Record<string, number>>,
            }
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

        return betResult;
    }
}
