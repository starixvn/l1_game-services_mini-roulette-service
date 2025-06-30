import mongoose from "mongoose";
import { RouletteGameData } from "../roulette-game-data";
import RouletteGameDefinition from "../roulette-game-definition";
import { RouletteBet } from "../types";

export default class RouletteWinFeatureConsumer {
    declare definition: RouletteGameDefinition;
    declare gameData: RouletteGameData;
    declare betsRepository: mongoose.Model<RouletteBet>;
    constructor({
        definition,
        gameData,
        betsRepository,
    }: {
        definition: RouletteGameDefinition;
        gameData: RouletteGameData;
        betsRepository: any;
    }) {
        this.definition = definition;
        this.gameData = gameData;
        this.betsRepository = betsRepository as any;
    }

    async getAccumulatedAmount(uid: string) {
        if (!this.gameData.playerBetHistory?.[uid]) {
            return 0;
        }

        const accumulatedDays = this.gameData.guaranteedWinFeature?.accumulatedDays ?? 3;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - accumulatedDays);

        return this.gameData.playerBetHistory[uid]
            .filter((bet: RouletteBet) => bet.time && new Date(bet.time) >= startDate)
            .reduce((total: number, bet: RouletteBet) => {
                return total + (bet.betwin || 0) - (bet.totalAmount || 0);
            }, 0);
    }

    getGuaranteedConfig(accumulatedAmount: number) {
        return accumulatedAmount < 0 ? this.gameData.guaranteedWinFeature : this.gameData.guaranteeLossFeature;
    }

    getFloatingValue(config: any) {
        return config?.floating ? Math.floor(Math.random() * (config.floating * 2 + 1) - config.floating) / 100 : 0;
    }

    isReachedThreshold(accumulatedAmount: number, config: any, floatingValue: number) {
        if (config?.enable) {
            const { probabilities } = config;
            return probabilities?.some((p: any) => Math.abs(accumulatedAmount) >= p.threshold + floatingValue * p.threshold);
        }
        return false;
    }

    getWinningPercentage(accumulatedAmount: number, config: any, floatingValue: number) {
        const { probabilities } = config;
        const probability = probabilities
            .sort((a: any, b: any) => b.threshold - a.threshold)
            .find((p: any) => Math.abs(accumulatedAmount) >= p.threshold + floatingValue * p.threshold);
        return probability?.winningPercentage ?? 0;
    }

    async generateResult(bet: RouletteBet) {
        const { name, uid } = bet;
        const resultFromAdmin = this.getResultFromAdmin(name);
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

    getResultFromAdmin(playerName: string) {
        const resultFromAdmin = this.gameData.settlementResultFromAdmin;
        if (playerName === resultFromAdmin.playerName) {
            this.gameData.settlementResultFromAdmin = {};
            return resultFromAdmin.result;
        }
        return null;
    }
}
