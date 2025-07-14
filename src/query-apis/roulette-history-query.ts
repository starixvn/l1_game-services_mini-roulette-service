import { Core } from "sc-game-base";
import mongoose from "mongoose";
import { RouletteBet, RouletteBetLog } from "../types";

export default class RouletteHistoryQuery extends Core.QueryApis.HistoryQuery {
    declare betsRepository: mongoose.Model<RouletteBet>;
    declare betLogsRepository: mongoose.Model<RouletteBetLog>;

    async queryHistoryByDate(player: any, page: number, pageSize: number, date: string) {
        if (!date) {
            return this.queryHistory(player, page, pageSize);
        }
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setSeconds(endDate.getSeconds() - 1);
        const filter = { uid: player.UID, paid: true, time: { $gte: startDate, $lte: endDate } };

        const numberOfSkippedBets = (page - 1) * pageSize;
        const total = await this.betsRepository.countDocuments(filter).exec();

        const betProjection = this.getBetProjection();

        const bets = await this.betsRepository
            .find(filter, betProjection, { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
            .lean()
            .exec();
        let betLogs = [];

        if (bets && bets.length > 0) {
            betLogs = await Promise.all(
                bets.map(async (bet) => {
                    const round = await this.roundQuery.getOne(bet.roundId, { _id: false });
                    const betLogDetails = this.betLogsRepository ? await this.getBetLogDetails(player, bet.roundId) : [];

                    return {
                        ...this.convertBet(bet),
                        phien: bet.roundId,
                        result: round.result,
                        settlementResult: round.settlementResult,
                        betLogDetails: this.convertBetLogs(betLogDetails),
                    };
                })
            );
        }

        return { history: { betLogs, page, pageSize, total } };
    }

    getBetLogDetails(player: any, roundId: number) {
        return this.betLogsRepository
            .find(
                { roundId, uid: player.UID },
                {
                    _id: false,
                    uid: false,
                    roundId: false,
                    playerId: false,
                    siteId: false,
                    __v: false,
                },
                { sort: { _id: -1 } }
            )
            .lean()
            .exec();
    }
}
