import { Core } from "sc-game-base";

export default class RouletteInGameConsumer extends Core.BaseEventConsumers.InGameConsumer {
    async consume(realPlayer) {
        const { remainingTime, gameConfigs, umMessages } = this.gameData;
        const disabled = !gameConfigs || !gameConfigs.enabled;
        if (disabled) {
            realPlayer.socketClient.emit(this.definition.name, { remainingTime, um: disabled, um_message: umMessages });
        }
        const payload = await this.buildPayload(realPlayer);
        realPlayer.socketClient.emit(this.definition.name, payload);
    }

    async buildPayload(realPlayer) {
        await this.getBalance(realPlayer, true);
        const { odds, originalOdds, enableFreeBet, boostedChoices } = this.gameData.gameConfigs;
        const { roundId, exchangeRates } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === session.currencyGroupId);
        const gameConfigs = { ...settings, odds, originalOdds, enableFreeBet, boostedChoices };
        const roundHistory = await this.roundQuery.getListByPlayerId(realPlayer.UID, this.definition.numberOfRoundHistory);
        const user = await this.getUserInfo(realPlayer.UID);

        return {
            roundId,
            gameConfigs,
            roundHistory,
            ownBets: {},
            user: { ...user, rate },
        };
    }
}
