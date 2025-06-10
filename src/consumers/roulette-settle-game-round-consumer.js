import { Table } from "sc-game-base";

export default class RouletteSettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    async settleOldBets() {
        const bets = await this.betsRepository.find({ paid: false }).lean().exec();

        if (bets.length > 0) {
            await Promise.all(
                bets.map(async (bet) => {
                    const { roundId, name } = bet;
                    await this.settleRound(name, roundId);
                })
            );
        }
    }

    async settleRound(playerName, roundId) {
        const round = await this.findOrCreateRound(roundId, playerName);
        if (round) {
            const finish = {
                settlementResult: round.settlementResult,
                result: round.result,
                roundId,
                time: round.time,
            };
            await this.settleBets(finish);
        }
    }

    async findOrCreateRound(roundId, playerName) {
        const round = await this.roundsRepository.findOne({ id: roundId }).lean().exec();
        if (round) {
            return round;
        } else {
            const { exchangeRates } = this.gameData;
            const result = this.generateResult(playerName);
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

    generateResult(playerName) {
        if (this.gameData.result) {
            return this.gameData.result;
        } else {
            const resultFromAdmin = this.gameData.settlementResultFromAdmin;
            const { randomMode } = this.gameData.gameConfigs;
            const result = playerName === resultFromAdmin.playerName ? resultFromAdmin.result : this.definition.generateResult(randomMode);
            this.gameData.settlementResultFromAdmin = {};
            return result;
        }
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const bet = await this.betsRepository.findOne({ roundId, paid: false }).exec();
        if (bet) {
            const odds = bet.odds || this.gameData.gameConfigs.odds;
            const betResult = this.calculateBetResult(settlementResult, bet, odds);

            bet.betwin = betResult.totalWin;
            bet.paid = true;

            await bet.save();
            await this.callEndGame(bet, roundId, time, betResult);

            this.captureBetResult(bet.uid, betResult, bet.rate);
            this.userBetResultPublisher.publishToUser(bet.uid, { finish: this.collectRoundResult(result, settlementResult, roundId) });
            await this.userBetResultPublisher.publish(bet.uid, betResult);
        }
    }

    captureBetResult(uid, betResult, rate) {
        // nothing
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
