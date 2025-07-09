import { Core } from "sc-game-base";
import { SpinConsumer, RouletteLeaderBoardConsumer } from "../consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    spinConsumer: SpinConsumer;
    leaderBoardConsumer: RouletteLeaderBoardConsumer;
    constructor(props: any) {
        super(props);
        this.spinConsumer = props.spinConsumer;
        this.leaderBoardConsumer = props.leaderBoardConsumer;
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

    async handleGetLeaderboard() {
        try {
            if (!this.verify()) {
                return;
            }
            const leaderboard = await this.leaderBoardConsumer.consume(this.gameData.realPlayers[this.socketClient.id]);
            this.socketClient.emit(this.definition.name, {
                leaderboard,
            });
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
