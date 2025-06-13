import { Table } from "sc-game-base";

export default class RouletteSettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    constructor(props) {
        super(props);
        this.roundResultConsumer = props.roundResultConsumer;
    }

    async settleOldBets() {
        const bets = await this.betsRepository.find({ paid: false }).exec();

        if (bets.length > 0) {
            await Promise.all(
                bets.map(async (bet) => {
                    const round = await this.findOrCreateRound(bet);
                    round && (await this.settleBet(bet, round));
                })
            );
        }
    }

    async settleRound(roundId) {
        const bet = await this.betsRepository.findOne({ roundId, paid: false }).exec();
        const round = await this.findOrCreateRound(bet);
        if (bet && round) {
            await this.settleBet(bet, round);
        }
    }

    async findOrCreateRound(bet) {
        if (!bet) {
            return null;
        }
        const { roundId } = bet;
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
                settlementResult,
                time: new Date(),
                exchangeRateId: exchangeRates.exId,
            };
            const roundDocument = await this.roundsRepository.create(newRound);
            return roundDocument?.toObject();
        }
    }

    async settleBet(bet, round) {
        const { id, time, result, settlementResult } = round;
        this.userBetResultPublisher.publishToUser(bet.uid, { finish: this.collectRoundResult(result, settlementResult, id) });

        const odds = bet.odds || this.gameData.gameConfigs.odds;
        const betResult = this.calculateBetResult(settlementResult, bet, odds);

        bet.betwin = betResult.totalWin;
        bet.paid = true;

        await bet.save();
        await this.callEndGame(bet, id, time, betResult);

        this.captureBetResult(bet.uid, betResult, bet.time);
        this.userBetResultPublisher.publish(bet.uid, betResult);
    }

    captureBetResult(uid, betResult, time) {
        const accumulatedDays = this.gameData.guaranteedWinFeature?.accumulatedDays ?? 3;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);
        const oldBetHistory = this.gameData.playerBetHistory?.[uid] || [];
        const newBetHistory = oldBetHistory.filter((bet) => bet.time && new Date(bet.time) >= startDate);
        newBetHistory.push({
            totalAmount: betResult.totalBetAmount,
            betwin: betResult.totalWin,
            time,
        });
        this.gameData.playerBetHistory[uid] = newBetHistory;
    }

    calculateBetResult(settlementResult, bet, odds) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [typeOfBets, winningChoices]) => {
                const choicesPerType = bet[typeOfBets];
                if (choicesPerType) {
                    const oddsOfType = odds?.[typeOfBets] ?? 0;
                    const winningByChoicesOfType = {};

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
                winningByChoices: {},
            }
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

        return betResult;
    }
}
