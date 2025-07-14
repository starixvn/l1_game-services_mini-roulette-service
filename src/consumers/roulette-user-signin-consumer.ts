import { Table } from "sc-game-base";
import { Socket } from "socket.io";
import LangliveUserSettingConsumer from "./langlive-user-setting-consumer";

export default class RouletteUserSigninConsumer extends Table.EventConsumers.TableUserSignInConsumer {
    declare userSignInPublisher: Table.EventPublishers.TableUserSignInPublisher;
    langliveUserSettingConsumer: LangliveUserSettingConsumer;

    constructor(
        definition: any,
        gameData: any,
        userSignInPublisher: any,
        playGamePermissionValidator: any,
        appConfigs: any,
        gameManagementApiClientFactory: any,
        langliveUserSettingConsumer: LangliveUserSettingConsumer
    ) {
        super(definition, gameData, userSignInPublisher, playGamePermissionValidator, appConfigs, gameManagementApiClientFactory);
        this.langliveUserSettingConsumer = langliveUserSettingConsumer;
    }

    handleSignInSuccess(socketClient: Socket, userInfo: any, userSession: any) {
        super.handleSignInSuccess(socketClient, userInfo, userSession);

        const { userId, playerAvatarUrl, playerNickname } = userSession;

        if (playerAvatarUrl && playerNickname) {
            this.langliveUserSettingConsumer.updateImageAndNickname(userId, { avatarUrl: playerAvatarUrl, nickname: playerNickname });
        }
    }
}
