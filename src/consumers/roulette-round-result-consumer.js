export default class RouletteWinFeatureConsumer {
    constructor({ definition, gameData, betsRepository }) {
        this.definition = definition;
        this.gameData = gameData;
        this.betsRepository = betsRepository;
    }

    async getAccumulatedAmount(uid) {
        if (!this.gameData.playerBetHistory?.[uid]) {
            return 0;
        }

        const accumulatedDays = this.gameData.guaranteedWinFeature?.accumulatedDays ?? 3;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);

        return this.gameData.playerBetHistory[uid]
            .filter((bet) => bet.time && new Date(bet.time) >= startDate)
            .reduce((total, bet) => {
                return total + (bet.betwin || 0) - (bet.totalAmount || 0);
            }, 0);
    }

    getGuaranteedConfig(accumulatedAmount) {
        return accumulatedAmount < 0 ? this.gameData.guaranteedWinFeature : this.gameData.guaranteeLossFeature;
    }

    getFloatingValue(config) {
        return config?.floating ? Math.floor(Math.random() * (config.floating * 2 + 1) - config.floating) / 100 : 0;
    }

    isReachedThreshold(accumulatedAmount, config, floatingValue) {
        if (config?.enable) {
            const { probabilities } = config;
            return probabilities?.some((p) => Math.abs(accumulatedAmount) >= p.threshold + floatingValue * p.threshold);
        }
        return false;
    }

    getWinningPercentage(accumulatedAmount, config, floatingValue) {
        const { probabilities } = config;
        const probability = probabilities
            .sort((a, b) => b.threshold - a.threshold)
            .find((p) => Math.abs(accumulatedAmount) >= p.threshold + floatingValue * p.threshold);
        return probability?.winningPercentage ?? 0;
    }

    async generateResult(bet) {
        const { name, uid } = bet;
        const resultFromAdmin = this.getResultFromAdmin(name, uid);
        if (resultFromAdmin) {
            return resultFromAdmin;
        }
        const accumulatedAmount = await this.getAccumulatedAmount(uid);
        const config = this.getGuaranteedConfig(accumulatedAmount);
        const floatingValue = this.getFloatingValue(config);
        if (this.isReachedThreshold(accumulatedAmount, config, floatingValue)) {
            const winningPercentage = this.getWinningPercentage(accumulatedAmount, config, floatingValue);
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
