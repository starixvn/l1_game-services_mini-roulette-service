export default class RouletteWinFeatureConsumer {
    constructor({ definition, gameData, betsRepository }) {
        this.definition = definition;
        this.gameData = gameData;
        this.betsRepository = betsRepository;
    }

    async getAccumulatedLostAmount(uid) {
        if (!this.gameData.playerBetHistory || !this.gameData.playerBetHistory[uid]) {
            return 0;
        }

        const accumulatedDays = this.gameData.guaranteedWinFeature?.accumulatedDays ?? 3;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);

        return this.gameData.playerBetHistory[uid]
            .filter((bet) => bet.time && new Date(bet.time) >= startDate)
            .reduce((total, bet) => {
                return total + (bet.totalAmount || 0) - (bet.betwin || 0);
            }, 0);
    }

    getWinningPercentage(accumulatedLostAmount) {
        const { probabilities } = this.gameData.guaranteedWinFeature;
        const probability = probabilities.sort((a, b) => b.threshold - a.threshold).find((p) => accumulatedLostAmount >= p.threshold);
        return probability?.winningPercentage ?? 0;
    }

    async generateResult(bet) {
        const { name, uid } = bet;
        const resultFromAdmin = this.getResultFromAdmin(name, uid);
        if (resultFromAdmin) {
            return resultFromAdmin;
        }
        const accumulatedLostAmount = await this.getAccumulatedLostAmount(uid);
        const { probabilities, enable } = this.gameData.guaranteedWinFeature;
        if (enable && probabilities?.some((p) => accumulatedLostAmount >= p.threshold)) {
            const winningPercentage = this.getWinningPercentage(accumulatedLostAmount);
            return this.definition.controlResultByBet(bet, winningPercentage);
        }

        const { randomMode } = this.gameData.gameConfigs;
        return this.definition.generateResult(randomMode);
    }

    getResultFromAdmin(playerName) {
        const resultFromAdmin = this.gameData.settlementResultFromAdmin;
        if (playerName === resultFromAdmin.playerName) {
            this.gameData.settlementResultFromAdmin = {};
            return resultFromAdmin.result;
        }
        return null;
    }
}
