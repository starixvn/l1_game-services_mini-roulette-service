import mongoose from "mongoose";
import { Core } from "sc-game-base";
import { RouletteBet, RoulettePlayerRound, RouletteRound } from "../types";

export default class RouletteRoundQuery extends Core.QueryApis.RoundQuery {
    declare playerRoundRepository: mongoose.Model<RoulettePlayerRound>;

    constructor(
        roundRepository: mongoose.Model<RouletteRound>,
        resultRepository: mongoose.Model<any>,
        playerRoundRepository: mongoose.Model<RoulettePlayerRound>
    ) {
        super(roundRepository, resultRepository);
        this.playerRoundRepository = playerRoundRepository;
    }

    async getListByPlayer(limit: number, projections: Record<string, boolean>, playerUID: string) {
        const rounds = await this.getList(limit, projections);
        const roundIds = rounds.map((round: any) => round.roundId);
        const playerRounds = await this.playerRoundRepository
            .find({ uid: playerUID, id: { $in: roundIds } }, projections)
            .lean()
            .exec();
        return rounds.map((round: any) => {
            const playerRound = playerRounds.find((playerRound: RoulettePlayerRound) => playerRound.id === round.roundId);
            const { result, settlementResult } = playerRound ?? round;
            return {
                roundId: playerRound?.id ?? round.roundId,
                result,
                settlementResult,
            };
        });
    }

    async getOneByBet(bet: RouletteBet, projections: Record<string, boolean>): Promise<RouletteRound | RoulettePlayerRound | null> {
        if (bet) {
            const { roundId, isControl } = bet;
            if (isControl) {
                return this.playerRoundRepository.findOne({ roundId }, projections).lean().exec();
            }
            return this.roundsRepository.findOne({ roundId }, projections).lean().exec();
        }
        return null;
    }
}
