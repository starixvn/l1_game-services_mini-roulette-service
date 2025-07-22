import { logger, utils } from "sc-common";
import { Response, Request } from "express";
import { Table } from "sc-game-base";
import { LangliveUserSettingConsumer } from "../consumers";
import { RouletteHistoryQuery } from "../query-apis";
import { RouletteGameData } from "../roulette-game-data";

export default class HttpRouter extends Table.Routers.TableHttpRouter {
    langliveUserSettingConsumer: LangliveUserSettingConsumer;
    publisher: Table.EventPublishers.TableBaseEventPublisher;
    declare gameData: RouletteGameData;
    constructor(
        appConfigs: any,
        gameData: RouletteGameData,
        historyQuery: RouletteHistoryQuery,
        metricQuery: any,
        logService: typeof logger,
        langliveUserSettingConsumer: LangliveUserSettingConsumer,
        publisher: Table.EventPublishers.TableBaseEventPublisher
    ) {
        super(appConfigs, gameData, historyQuery, metricQuery, logService);
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
        this.publisher = publisher;
    }

    init(app: any) {
        super.init(app);
        app.post("/api/set-result", this.handleSetResult());
        app.post("/api/update-leaderboard-settings", (req: Request, res: Response) =>
            this.verifySession(req, res, this.handleUpdateLeaderboardSettings.bind(this))
        );
        app.post(
            "/api/void-ticket",
            utils.authentication.useAuthenticate({
                authUrl: this.appConfigs.apiSettings.authUrl,
                audiences: this.appConfigs.authenticateSettings.audiences,
            }),
            (req: Request, res: Response) => this.handleVoidTicket(req, res)
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
            if (hideAvatar !== undefined && hideName !== undefined) {
                this.langliveUserSettingConsumer.updateLeaderboardSettings(userSession.userId, { hideAvatar, hideName });
                res.send({ success: true });
                return;
            }
            res.send({ success: false });
        } catch (error) {
            this.logService.logError(error);
            res.send({ error: true });
        }
    }

    async handleVoidTicket(req: Request, res: Response) {
        try {
            const { Name, UserIdentify, RoundId } = req?.body || {};
            if (!Name || !RoundId) {
                this.logService.logError("Void ticket request is missing required parameters");
                res.send(false);
                return;
            }
            if (this.isRunningRound(Name, RoundId)) {
                delete this.gameData.ingame[Name];
                this.logService.logError(`Void running ticket from api call for ${JSON.stringify(Name)}`);
                this.publisher.publishToUser(UserIdentify, { toLobby: true });
            }
            if (this.gameData.playerBetHistory[UserIdentify]) {
                this.gameData.playerBetHistory[UserIdentify] = this.gameData.playerBetHistory[UserIdentify].filter(
                    (bet) => bet.roundId !== RoundId
                );
            }

            res.send(true);
        } catch (error) {
            this.logService.logError(error);
            res.send(false);
        }
    }

    isRunningRound(playerName: string, roundId: number) {
        const playerBet = this.gameData.ingame[playerName];
        if (playerBet) {
            return playerBet.roundId === roundId;
        }
        return false;
    }
}
