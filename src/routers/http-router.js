import { Table } from "sc-game-base";

export default class HttpRouter extends Table.Routers.TableHttpRouter {
    init(app) {
        super.init(app);
        app.post("/api/set-result", this.handleSetResult());
    }

    handleSetResult() {
        return async (req, res) => {
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
}
