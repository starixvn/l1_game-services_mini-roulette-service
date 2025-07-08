import { Core } from "sc-game-base";
import { SpinConsumer } from "../consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    spinConsumer: SpinConsumer;
    constructor(props: any) {
        super(props);
        this.spinConsumer = props.spinConsumer;
    }

    init(socketClient: any) {
        super.init(socketClient);
        this.socketClient.on("spin", this.handleSpin.bind(this));
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
}
