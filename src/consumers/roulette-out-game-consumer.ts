import { logger } from "sc-common";
import { Core } from "sc-game-base";
import { RouletteGameData } from "../roulette-game-data";
import { Socket } from "socket.io";
import SettleGameRoundConsumer from "./roulette-settle-game-round-consumer";

export default class RouletteOutGameConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: RouletteGameData;
    declare settleGameRoundConsumer: SettleGameRoundConsumer;
    declare logService: typeof logger;
    constructor(gameData: RouletteGameData, settleGameRoundConsumer: SettleGameRoundConsumer, logService: typeof logger) {
        super(gameData);
        this.settleGameRoundConsumer = settleGameRoundConsumer;
        this.logService = logService;
    }

    async consume(socketClient: Socket) {
        try {
            const player = this.gameData.realPlayers[socketClient?.id];
            if (!player) {
                return;
            }
            const playerData = this.gameData.ingame?.[player?.profile?.name];
            if (playerData) {
                const { roundId, betTracks, betQueue } = playerData;
                if (roundId > 0 && Object.keys(betTracks).length > 0 && betQueue?.length === 0) {
                    await this.settleGameRoundConsumer.settleRoundById(roundId, player.profile.name);
                }
            }
            super.consume(socketClient);
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
