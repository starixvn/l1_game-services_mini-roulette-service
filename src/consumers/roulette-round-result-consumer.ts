import { RouletteGameData } from "../roulette-game-data";
import RouletteGameDefinition from "../roulette-game-definition";
import { GuaranteedStatus, RouletteBet } from "../types";

export default class RouletteRoundResultConsumer {
    declare definition: RouletteGameDefinition;
    declare gameData: RouletteGameData;
    constructor({ definition, gameData }: { definition: RouletteGameDefinition; gameData: RouletteGameData }) {
        this.definition = definition;
        this.gameData = gameData;
    }

    async generateResult(bet: RouletteBet, status: GuaranteedStatus | null) {
        const resultFromAdmin = this.getResultFromAdmin(bet.name);
        if (resultFromAdmin !== null) {
            return resultFromAdmin;
        }
        const { randomMode } = this.gameData.gameConfigs;
        if (status?.isReached) {
            const { winningPercentage } = status;
            return this.definition.controlResultByBet(bet, winningPercentage, randomMode);
        }

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
