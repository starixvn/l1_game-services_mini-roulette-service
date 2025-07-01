import { Table } from "sc-game-base";
import { RouletteRoundQuery } from "../query-apis";

export default class RouletteInGameConsumer extends Table.EventConsumers.TableInGameConsumer {
    declare roundQuery: RouletteRoundQuery;

    async buildPayload(realPlayer: any): Promise<any> {
        const user = await this.getUserInfo(realPlayer);
        const roundHistory = await this.roundQuery.getListByPlayer(this.definition.numberOfRoundHistory, { _id: false }, realPlayer.UID);
        const { totalBets, roundId, exchangeRates, remainingTime, chips } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const gameConfigs = this.getGameConfigs(realPlayer);
        const { ownBets } = this.gameData.ingame[realPlayer.profile.name] || { ownBets: {} };
        const players = this.buildPlayersPayload(realPlayer);
        return { roundId, gameConfigs, roundHistory, ownBets, totalBets, user: { ...user, rate }, remainingTime, players, chips };
    }

    getGameConfigs(realPlayer: any) {
        const { odds, originalOdds, enableFreeBet, boostedChoices } = this.gameData.gameConfigs;
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId?.toString() === realPlayer.session?.currencyGroupId);
        return { ...settings, odds, originalOdds, enableFreeBet, boostedChoices };
    }
}
