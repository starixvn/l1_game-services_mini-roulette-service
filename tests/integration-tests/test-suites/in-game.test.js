import { initUserSession } from "../helper/helper";
import { GameClientDriver, normalUser } from "sc-game-service-integration-utils";
import { socketOptionsFunc } from "../_stubs/test-data";
import appConfigs from "../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("in game", () => {
    let client;

    beforeEach(async () => {
        client = new GameClientDriver(socketOptions, initUserSession(normalUser));
        const sendSignInInterval = setInterval(() => {
            client.sendSignInEvent();
        }, 500);

        await client.handleSignedInEvent();
        clearInterval(sendSignInInterval);
    });

    afterEach(() => {
        client.close();
        client = null;
    });

    it("should receive game configs response", async () => {
        // Arrange
        client.sendInGameEvent();

        // Act
        const data = await client.handleGameEvent((data) => data.gameConfigs);

        // Assert
        expect(data.gameConfigs?.gameId).toBe(134);
        expect(data.gameConfigs?.odds).toEqual({ dozen: 3, oddEven: 2, redBlack: 2, straightUp: 36 });
    });

    it("should receive user info", async () => {
        // Arrange
        client.sendInGameEvent();

        // Act
        const data = await client.handleGameEvent((data) => data.user);

        // Assert
        expect(data.user.name).toBe(normalUser.playerName);
        expect(data.user.rate).toBe(1);
    });

    it("should receive round history", async () => {
        // Arrange
        client.sendInGameEvent();

        // Act
        const data = await client.handleGameEvent((data) => data.roundHistory);

        // Assert
        expect(data.roundHistory.length).toBe(2);
        expect(data.roundHistory[0].roundId).toBe(2);
        expect(data.roundHistory[0].result).toBe(2);
        expect(data.roundHistory[1].roundId).toBe(1);
        expect(data.roundHistory[1].result).toBe(1);
    });
});
