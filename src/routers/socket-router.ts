import { Core } from "sc-game-base";
import { ActionSettleConsumer, RouletteLeaderboardConsumer, RebetConsumer } from "../consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    actionSettleConsumer: ActionSettleConsumer;
    leaderboardConsumer: RouletteLeaderboardConsumer;
    rebetConsumer: RebetConsumer;
    constructor(props: any) {
        super(props);
        this.actionSettleConsumer = props.actionSettleConsumer;
        this.leaderboardConsumer = props.leaderboardConsumer;
        this.rebetConsumer = props.rebetConsumer;
    }

    init(socketClient: any) {
        super.init(socketClient);
        this.socketClient.on("spin", this.handleActionSettle.bind(this));
        this.socketClient.on("settle", this.handleActionSettle.bind(this));
        this.socketClient.on("getLeaderboard", this.handleGetLeaderboard.bind(this));
        this.socketClient.on("rebet", this.handleRebet.bind(this));
    }

    handleActionSettle() {
        try {
            if (!this.verify()) {
                return;
            }
            this.actionSettleConsumer.consume(this.gameData.realPlayers[this.socketClient.id]);
        } catch (error) {
            this.logService.logError(error);
        }
    }

    async handleGetLeaderboard(payload: any) {
        try {
            if (!this.verify()) {
                return;
            }
            const leaderboard = await this.leaderboardConsumer.consume(this.gameData.realPlayers[this.socketClient.id], {
                top: payload?.top ?? 30,
            });
            this.socketClient.emit(this.definition.name, {
                leaderboard,
            });
        } catch (error) {
            this.logService.logError(error);
        }
    }

    handleRebet(payload: any) {
        try {
            if (!this.verify()) {
                return;
            }
            this.rebetConsumer.consume(this.gameData.realPlayers[this.socketClient.id], payload);
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
