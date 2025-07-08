import { Core } from "sc-game-base";
import { RouletteRoundQuery } from "../query-apis";

export default class RouletteInGameConsumer extends Core.BaseEventConsumers.InGameConsumer {
    declare roundQuery: RouletteRoundQuery;

    async consume(realPlayer: any) {
        const { remainingTime, gameConfigs, umMessages } = this.gameData;
        const disabled = !gameConfigs || !gameConfigs.enabled;
        if (disabled) {
            realPlayer.socketClient.emit(this.definition.name, { remainingTime, um: disabled, um_message: umMessages });
        }
        const payload = await this.buildPayload(realPlayer);
        realPlayer.socketClient.emit(this.definition.name, payload);
    }

    async buildPayload(realPlayer: any): Promise<any> {
        const user = await this.getUserInfo(realPlayer);
        const roundHistory = await this.roundQuery.getListByPlayerId(realPlayer.UID, this.definition.numberOfRoundHistory);
        const { exchangeRates } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const gameConfigs = this.getGameConfigs(realPlayer);
        const { ownBets, roundId } = this.gameData.ingame[realPlayer.profile.name] || { ownBets: {}, roundId: 0 };

        return {
            gameConfigs,
            roundHistory,
            ownBets,
            roundId,
            user: { ...user, rate },
        };
    }

    getGameConfigs(realPlayer: any) {
        const { odds, originalOdds, enableFreeBet, boostedChoices } = this.gameData.gameConfigs;
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId?.toString() === realPlayer.session?.currencyGroupId);
        return { ...settings, odds, originalOdds, enableFreeBet, boostedChoices };
    }
}
