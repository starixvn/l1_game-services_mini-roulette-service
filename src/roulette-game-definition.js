import { Table } from "sc-game-base";

export default class RouletteGameDefinition extends Table.TableGameDefinition {
    constructor(gameSettings, generateResult, settle, generateRawResultForHash, controlResultByBet) {
        super(gameSettings, generateResult, settle, generateRawResultForHash);
        this.controlResultByBet = controlResultByBet;
    }
}
