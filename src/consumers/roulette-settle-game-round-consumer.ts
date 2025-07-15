import mongoose from "mongoose";
import { logger } from "sc-common";
import { SettleGameRoundConsumer } from "sc-game-base/src/core/event-consumers";
import RouletteRoundResultConsumer from "./roulette-round-result-consumer";
import { GuaranteedStatus, RouletteBet, RouletteRound, SettlementResult } from "../types";
import { RouletteGameData } from "../roulette-game-data";
import RouletteGuaranteedFeatureConsumer from "./roulette-guaranteed-feature-consumer";
import Constants from "../constants";

export default class RouletteSettleGameRoundConsumer extends SettleGameRoundConsumer {
    declare gameData: RouletteGameData;
    declare betsRepository: mongoose.Model<RouletteBet>;
    declare roundsRepository: mongoose.Model<RouletteRound>;
    declare roundResultConsumer: RouletteRoundResultConsumer;
    declare guaranteedFeatureConsumer: RouletteGuaranteedFeatureConsumer;
    declare logService: typeof logger;

    constructor(props: any) {
        super(props);
        this.roundResultConsumer = props.roundResultConsumer;
        this.guaranteedFeatureConsumer = props.guaranteedFeatureConsumer;
        this.logService = props.logService;
    }

    async settleUnsettledBets() {
        const bets = await this.betsRepository.find({ paid: false }).exec();
        if (bets.length > 0) {
            await Promise.all(
                bets.map(async (bet) => {
                    await this.settleBet(bet);
                })
            );
        }
    }

    async settleRoundById(roundId: number, playerName: string) {
        this.gameData.ingame[playerName] && (this.gameData.ingame[playerName].settleProcessing = true);
        const bet = await this.betsRepository.findOne({ roundId }).exec();
        if (bet) {
            bet.paid !== true && (await this.settleBet(bet));
        } else {
            this.logService.logError(`No bet found for roundId: ${roundId}`);
        }
        delete this.gameData.ingame[playerName];
    }

    async settleBet(bet: mongoose.Document<RouletteBet> & RouletteBet) {
        const guaranteedFeature = await this.guaranteedFeatureConsumer.calculateGuaranteedFeatureStatus(bet);
        const round = await this.findOrCreateRound(bet, guaranteedFeature);
        if (!round) {
            this.logService.logError(`Cannot create round for roundId: ${bet.roundId}`);
            return;
        }
        const { id, time, result, settlementResult } = round;

        const odds = bet.odds || this.gameData.gameConfigs.odds;
        const betResult = this.calculateBetResult(settlementResult, bet, odds);
        bet.betwin = betResult.totalWin;
        bet.paid = true;
        bet.guaranteedWinStatus = guaranteedFeature?.guaranteedWinStatus;
        bet.guaranteedLossStatus = guaranteedFeature?.guaranteedLossStatus;
        bet.accumulatedAmount = guaranteedFeature?.accumulatedAmount;

        const metaData = this.createMetadata({ bet, settlementResult, result });

        bet.settlementDetails = metaData.BetDetails?.map((detail) => ({
            choiceId: detail.ChoiceId,
            totalAmount: detail.TotalAmount,
            validBetAmount: detail.ValidBetAmount,
            totalWin: detail.TotalWin,
        }));

        await bet.save();
        await this.callEndGame(bet, id, time, betResult, metaData);

        this.captureBetHistory(bet.uid, id, betResult, bet.time, guaranteedFeature);
        this.userBetResultPublisher.publishToUser(bet.uid, { finish: { result, settlementResult, roundId: id } });
        this.userBetResultPublisher.publish(bet.uid, betResult);
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

    createMetadata({ bet, settlementResult, result }: { bet: RouletteBet; settlementResult: SettlementResult; result: any }) {
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
            Result: result.toString(),
        };
    }

    captureBetHistory(
        uid: string,
        roundId: number,
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
            roundId,
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
