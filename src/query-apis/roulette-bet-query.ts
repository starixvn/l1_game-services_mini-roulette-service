import { RouletteBets } from "../models";
import { getStartDate } from "../helpers/day-helper";

export default class RouletteBetQuery {
    declare betsRepository: typeof RouletteBets;

    constructor(betsRepository: typeof RouletteBets) {
        this.betsRepository = betsRepository;
    }

    async getBetHistoryGroupByPlayer(totalDays: number) {
        const utcStartDate = getStartDate(totalDays);

        const results = await this.betsRepository
            .aggregate([
                {
                    $match: {
                        paid: true,
                        time: { $gte: utcStartDate },
                    },
                },
                {
                    $sort: {
                        time: -1,
                    },
                },
                {
                    $group: {
                        _id: "$uid",
                        bets: {
                            $push: {
                                totalAmount: "$totalAmount",
                                betwin: "$betwin",
                                time: "$time",
                                guaranteedWinStatus: "$guaranteedWinStatus",
                                guaranteedLossStatus: "$guaranteedLossStatus",
                            },
                        },
                    },
                },
            ])
            .exec();

        return results.reduce((acc: Record<string, any>, curr: any) => {
            acc[curr._id] = curr.bets;
            return acc;
        }, {});
    }
}
