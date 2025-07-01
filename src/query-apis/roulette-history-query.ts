import mongoose from "mongoose";
import { Core } from "sc-game-base";
import { RouletteBet } from "../types";
import RouletteRoundQuery from "./roulette-round-query";

export default class RouletteHistoryQuery extends Core.QueryApis.HistoryQuery {
    declare roundQuery: RouletteRoundQuery;
    declare betsRepository: mongoose.Model<RouletteBet>;

    async queryHistory(player: any, page: number, pageSize: number) {
        if (page < 1 || !player) {
            return {};
        }

        const filter = { uid: player.UID, paid: true };
        const numberOfSkippedBets = (page - 1) * pageSize;
        const total = await this.betsRepository.countDocuments(filter).exec();

        const betProjection = this.getBetProjection();

        const bets = await this.betsRepository
            .find(filter, betProjection, { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
            .lean()
            .exec();
        let betLogs: any[] = [];

        if (bets && bets.length > 0) {
            betLogs = await Promise.all(
                bets.map(async (bet) => {
                    const round = await this.roundQuery.getOneByBet(bet, { _id: false });
                    const betLogDetails = this.betLogsRepository ? await this.getBetLogDetails(player, bet.roundId) : [];

                    return {
                        ...this.convertBet(bet),
                        phien: bet.roundId,
                        result: round?.result,
                        settlementResult: round?.settlementResult,
                        betLogDetails: this.convertBetLogs(betLogDetails),
                    };
                })
            );
        }

        return { history: { betLogs, page, pageSize, total } };
    }

    getBetProjection() {
        return {
            _id: false,
            uid: false,
            siteId: false,
            playerId: false,
            __v: false,
            __archive: false,
            currency: false,
            operatorId: false,
            paid: false,
        };
    }

    convertBet(bet: RouletteBet) {
        const result = { ...bet };
        delete result.isControl;
        return result;
    }
}
