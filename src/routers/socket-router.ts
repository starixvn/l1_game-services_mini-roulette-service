import { Core } from "sc-game-base";
import { HandleActionSettleConsumer, RouletteLeaderboardConsumer, RebetConsumer, LangliveUserSettingConsumer } from "../consumers";
import RouletteHistoryQuery from "../query-apis/roulette-history-query";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    handleActionSettleConsumer: HandleActionSettleConsumer;
    leaderboardConsumer: RouletteLeaderboardConsumer;
    rebetConsumer: RebetConsumer;
    langliveUserSettingConsumer: LangliveUserSettingConsumer;
    declare historyQuery: RouletteHistoryQuery;

    constructor(props: any) {
        super(props);
        this.handleActionSettleConsumer = props.handleActionSettleConsumer;
        this.leaderboardConsumer = props.leaderboardConsumer;
        this.rebetConsumer = props.rebetConsumer;
        this.langliveUserSettingConsumer = props.langliveUserSettingConsumer;
    }

    init(socketClient: any) {
        super.init(socketClient);
        this.socketClient.on("settle", this.handleActionSettle.bind(this));
        this.socketClient.on("getLeaderboard", this.handleGetLeaderboard.bind(this));
        this.socketClient.on("rebet", this.handleRebet.bind(this));
        this.socketClient.on("updateLeaderboardSettings", this.handleUpdateLeaderboardSettings.bind(this));
        this.socketClient.on("getLeaderboardSettings", this.handleGetLeaderboardSettings.bind(this));
    }

    async handleGetHistory(payload: any) {
        try {
            if (!this.verify()) {
                return;
            }

            const history = await this.historyQuery.queryHistoryByDate(
                this.gameData.realPlayers?.[this.socketClient.id],
                payload.page,
                this.definition.historyPageSize,
                payload.date
            );

            this.socketClient.emit(this.definition.name, history);
        } catch (error) {
            this.logService.logError(error);
        }
    }

    handleActionSettle() {
        try {
            if (!this.verify()) {
                return;
            }
            this.handleActionSettleConsumer.consume(this.gameData.realPlayers[this.socketClient.id]);
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
                top: payload?.top ?? 100,
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

    handleUpdateLeaderboardSettings(payload: any) {
        try {
            if (!this.verify()) {
                return;
            }
            if (payload.hideAvatar !== undefined && payload.hideName !== undefined) {
                this.langliveUserSettingConsumer.updateLeaderboardSettings(this.gameData.realPlayers[this.socketClient.id].UID, payload);
            }
        } catch (error) {
            this.logService.logError(error);
        }
    }

    async handleGetLeaderboardSettings() {
        try {
            if (!this.verify()) {
                return;
            }
            const leaderboardSettings = await this.langliveUserSettingConsumer.getLeaderboardSettings(
                this.gameData.realPlayers[this.socketClient.id].UID
            );
            this.socketClient.emit(this.definition.name, {
                leaderboardSettings,
            });
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
