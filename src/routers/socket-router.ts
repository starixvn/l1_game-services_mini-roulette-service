import { Core } from "sc-game-base";
import { SpinConsumer, RouletteLeaderboardConsumer } from "../consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    spinConsumer: SpinConsumer;
    leaderboardConsumer: RouletteLeaderboardConsumer;
    constructor(props: any) {
        super(props);
        this.spinConsumer = props.spinConsumer;
        this.leaderboardConsumer = props.leaderboardConsumer;
    }

    init(socketClient: any) {
        super.init(socketClient);
        this.socketClient.on("spin", this.handleSpin.bind(this));
        this.socketClient.on("getLeaderboard", this.handleGetLeaderboard.bind(this));
    }

    async handleSpin() {
        try {
            if (!this.verify()) {
                return;
            }
            await this.spinConsumer.consume(this.gameData.realPlayers[this.socketClient.id]);
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
}
