import { Table } from "sc-game-base";
import { SettlementResult } from "../types";

export default class RouletteSettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    calculateBetResult(settlementResult: any, bet: any, odds: Record<string, number>) {
        const betResult = Object.entries(settlementResult as SettlementResult).reduce(
            (result, [typeOfBets, winningChoices]) => {
                const choicesPerType = bet[typeOfBets] as Record<string, number>;

                if (choicesPerType) {
                    const oddsOfType = odds[typeOfBets] ?? 0;
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
