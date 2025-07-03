import { Core } from "sc-game-base";
import { RouletteRound } from "../types";

export default class RouletteRoundQuery extends Core.QueryApis.RoundQuery {
    async getListByPlayerId(uid: string, limit: number) {
        const rounds = await this.roundsRepository
            .find({ uid }, { id: true, result: true, settlementResult: true, _id: false }, { sort: { id: -1 }, limit: limit })
            .lean()
            .exec();

        return rounds.map((round: RouletteRound) => ({
            roundId: round.id,
            result: round.result,
            settlementResult: round.settlementResult,
        }));
    }
}
