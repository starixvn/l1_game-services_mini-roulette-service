import { Table } from "sc-game-base";
import { TableGameSettings } from "sc-game-base/src/core/game-definition";

export default class RouletteGameDefinition extends Table.TableGameDefinition {
    controlResultByBet: Function;
    declare durations: {
        wholeRound: number;
        placingBets: number;
        lockingBet: number;
        shakeThePlateDuration: number;
    };
    constructor(
        gameSettings: TableGameSettings,
        generateResult: Function,
        settle: Function,
        generateRawResultForHash: Function,
        controlResultByBet: Function
    ) {
        super(gameSettings, generateResult, settle, generateRawResultForHash);
        this.controlResultByBet = controlResultByBet;
    }
}
