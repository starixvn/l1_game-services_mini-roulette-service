import { Core } from "sc-game-base";

export default class RouletteHistoryQuery extends Core.QueryApis.HistoryQuery {
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
