export default class RouletteBetQuery {
    constructor(betsRepository) {
        this.betsRepository = betsRepository;
    }

    /**
     * Get bet details for each player within specified days
     * @param {number} ndays - Number of days to look back
     * @returns {Promise<Object.<string, Array<{totalAmount: number, betwin: number, time: Date}>>>} Object with player UIDs as keys and array of bet details as values
     */
    async getBetHistoryByPlayer(ndays) {
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

        // Convert array of results to object with uid as key
        return results.reduce((acc, curr) => {
            acc[curr._id] = curr.bets;
            return acc;
        }, {});
    }
}
