import { Response, Request } from "express";
import { Table } from "sc-game-base";
import { LangliveUserSettingConsumer } from "../consumers";

export default class HttpRouter extends Table.Routers.TableHttpRouter {
    langliveUserSettingConsumer: LangliveUserSettingConsumer;
    constructor(
        appConfigs: any,
        gameData: any,
        historyQuery: any,
        metricQuery: any,
        logService: any,
        langliveUserSettingConsumer: LangliveUserSettingConsumer
    ) {
        super(appConfigs, gameData, historyQuery, metricQuery, logService);
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
    }

    init(app: any) {
        super.init(app);
        app.post("/api/set-result", this.handleSetResult());
        app.post("/api/update-leaderboard-settings", (_req: Request, res: Response) =>
            this.verifySession(_req, res, this.handleUpdateLeaderboardSettings.bind(this))
        );
    }

    handleSetResult() {
        return async (req: Request, res: Response) => {
            if (this.appConfigs.disableSetResult || this.appConfigs.sentry.env === "PROD") {
                res.sendStatus(404);
                return;
            }

            const { result, playerName } = req.body;
            this.gameData.settlementResultFromAdmin = { playerName, result };
            this.logService.logError(`Set result from admin: ${JSON.stringify(this.gameData.settlementResultFromAdmin)}`);
            res.send(true);
        };
    }

    async handleUpdateLeaderboardSettings(req: Request, res: Response, userSession: any) {
        try {
            const { hideAvatar, hideName } = req.body;
            if (hideAvatar != undefined && hideName != undefined) {
                this.langliveUserSettingConsumer.updateLeaderboardSettings(userSession.userId, { hideAvatar, hideName });
                res.send({ success: true });
            }
            res.send({ success: false });
        } catch (error) {
            this.logService.logError(error);
            res.send({ error: true });
        }
    }
}
