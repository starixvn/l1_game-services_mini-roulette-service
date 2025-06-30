import { RouletteBets } from "../models";

export default class RouletteBetQuery {
    declare betsRepository: typeof RouletteBets;

    constructor(betsRepository: typeof RouletteBets) {
        this.betsRepository = betsRepository;
    }

    async getBetHistoryByPlayer(ndays: number) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - ndays);

        const results = await this.betsRepository
            .aggregate([
                {
                    $match: {
                        time: { $gte: startDate },
                        paid: true,
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
