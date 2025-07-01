import { RouletteGameData } from "../roulette-game-data";
import RouletteGameDefinition from "../roulette-game-definition";

export default class RouletteRoundResultConsumer {
    definition: RouletteGameDefinition;
    gameData: RouletteGameData;

    constructor({ definition, gameData }: { definition: RouletteGameDefinition; gameData: RouletteGameData }) {
        this.definition = definition;
        this.gameData = gameData;
    }

    async generateResult() {}

    generateResultFromAdmin(playerName: string) {
        const resultFromAdmin = this.gameData.settlementResultFromAdmin;
        if (playerName === resultFromAdmin.playerName) {
            this.gameData.settlementResultFromAdmin = {};
            return resultFromAdmin.result;
        }
        return null;
    }
}
