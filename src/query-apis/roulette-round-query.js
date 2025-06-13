import { Core } from "sc-game-base";

export default class RouletteRoundQuery extends Core.QueryApis.RoundQuery {
    async getListByPlayerId(uid, limit) {
        const rounds = await this.roundsRepository
            .find({ uid }, { id: 1, result: 1, settlementResult: 1, _id: 0 }, { sort: { id: -1 }, limit: limit })
            .lean()
            .exec();

        return rounds.map((round) => ({
            roundId: round.id,
            result: round.result,
            settlementResult: round.settlementResult,
        }));
    }
}
