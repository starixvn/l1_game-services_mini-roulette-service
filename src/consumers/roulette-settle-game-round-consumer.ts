import mongoose from "mongoose";
import { SettleGameRoundConsumer } from "sc-game-base/src/core/event-consumers";
import RouletteRoundResultConsumer from "./roulette-round-result-consumer";
import { GuaranteedStatus, RouletteBet, SettlementResult } from "../types";
import { RouletteGameData } from "../roulette-game-data";
import RouletteGuaranteedFeatureConsumer from "./roulette-guaranteed-feature-consumer";
import Constants from "../constants";

export default class RouletteSettleGameRoundConsumer extends SettleGameRoundConsumer {
    declare gameData: RouletteGameData;
    declare roundResultConsumer: RouletteRoundResultConsumer;
    declare guaranteedFeatureConsumer: RouletteGuaranteedFeatureConsumer;

    constructor(props: any) {
        super(props);
        this.roundResultConsumer = props.roundResultConsumer;
        this.guaranteedFeatureConsumer = props.guaranteedFeatureConsumer;
    }

    async settleUnsettledBets() {
        const bets = await this.betsRepository.find({ paid: false }).exec();
        if (bets.length > 0) {
            await Promise.all(
                bets.map(async (bet: mongoose.Document<RouletteBet> & RouletteBet) => {
                    await this.settleBet(bet);
                })
            );
        }
    }

    async settleRoundById(roundId: number) {
        const bet = await this.betsRepository.findOne({ roundId, paid: false }).exec();
        bet && (await this.settleBet(bet));
    }

    async settleBet(bet: mongoose.Document<RouletteBet> & RouletteBet) {
        const guaranteedFeature = await this.guaranteedFeatureConsumer.calculateGuaranteedFeatureStatus(bet);
        const round = await this.findOrCreateRound(bet, guaranteedFeature);
        if (!round) {
            return;
        }
        const { id, time, result, settlementResult } = round;
        this.userBetResultPublisher.publishToUser(bet.uid, { finish: { result, settlementResult, roundId: id } });

        const odds = bet.odds || this.gameData.gameConfigs.odds;
        const betResult = this.calculateBetResult(settlementResult, bet, odds);

        bet.betwin = betResult.totalWin;
        bet.paid = true;
        bet.guaranteedWinStatus = guaranteedFeature?.guaranteedWinStatus;
        bet.guaranteedLossStatus = guaranteedFeature?.guaranteedLossStatus;

        const metaData = this.createMetadata(bet, settlementResult);
        bet.settlementDetails = metaData.BetDetails?.map((detail) => ({
            choiceId: detail.ChoiceId,
            totalAmount: detail.TotalAmount,
            validBetAmount: detail.ValidBetAmount,
            totalWin: detail.TotalWin,
        }));

        await bet.save();
        await this.callEndGame(bet, id, time, betResult, metaData);

        this.captureBetHistory(bet.uid, betResult, bet.time, guaranteedFeature);
        this.userBetResultPublisher.publish(bet.uid, betResult);
        this.resetPlayerData(bet.name);
    }

    async findOrCreateRound(bet: RouletteBet, status: GuaranteedStatus | null) {
        if (!bet) {
            return null;
        }
        const { roundId, uid } = bet;
        const round = await this.roundsRepository.findOne({ id: roundId }).lean().exec();
        if (round) {
            return round;
        } else {
            const { exchangeRates } = this.gameData;
            const result = await this.roundResultConsumer.generateResult(bet, status);
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

    createMetadata(bet: RouletteBet, settlementResult: SettlementResult) {
        const odds = bet.odds || this.gameData.gameConfigs.odds;
        const betDetails: Array<{ ChoiceId: number; ValidBetAmount: number; TotalAmount: number; TotalWin: number }> = [];
        const betTypes = Object.values(Constants.betTypes);

        betTypes.forEach((betType) => {
            const betChoices = bet[betType as keyof RouletteBet] as Record<string, number> | undefined;
            if (!betChoices) return;

            const oddsOfType = odds?.[betType] ?? 0;

            Object.entries(betChoices).forEach(([choice, amount]) => {
                const isWin = settlementResult[betType as keyof SettlementResult]?.includes(choice);
                const winAmount = isWin ? amount * oddsOfType : 0;
                const choiceId = (this.definition.choicesMapper as Record<string, Record<string, number>>)?.[betType]?.[choice] ?? 0;

                betDetails.push({
                    ChoiceId: choiceId,
                    ValidBetAmount: amount,
                    TotalAmount: amount,
                    TotalWin: winAmount,
                });
            });
        });

        return {
            BetDetails: betDetails,
        };
    }

    resetPlayerData(playerName: string) {
        delete this.gameData.ingame[playerName];
    }

    captureBetHistory(
        uid: string,
        betResult: { totalBetAmount: number; totalWin: number },
        time: Date,
        guaranteedFeature: GuaranteedStatus | null
    ) {
        const accumulatedDays = this.gameData.accumulatedDays;
        if (accumulatedDays <= 0) {
            this.gameData.playerBetHistory[uid] = [];
            return;
        }
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);
        const oldBetHistory = this.gameData.playerBetHistory?.[uid] || [];
        const newBetHistory = oldBetHistory.filter((bet: any) => bet.time && new Date(bet.time) >= startDate);
        newBetHistory.unshift({
            totalAmount: betResult.totalBetAmount,
            betwin: betResult.totalWin,
            time,
            guaranteedWinStatus: guaranteedFeature?.guaranteedWinStatus ?? Constants.guaranteedStatus.exited,
            guaranteedLossStatus: guaranteedFeature?.guaranteedLossStatus ?? Constants.guaranteedStatus.exited,
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
