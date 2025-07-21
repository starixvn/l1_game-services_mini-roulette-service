import { describe, expect } from "@jest/globals";
import { GameClientDriver, eventTypes, normalUser } from "sc-game-service-integration-utils";
import appConfigs from "../../../build/app-configs.IGT";
import { socketOptionsFunc } from "../_stubs/test-data";
import { initUserSession } from "../helper/helper";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("place bet & settle", () => {
    let client;

    beforeAll(async () => {
        client = new GameClientDriver(socketOptions, initUserSession(normalUser));

        const sendSignInInterval = setInterval(() => {
            client.sendSignInEvent();
        }, 500);

        await client.handleSignedInEvent();
        clearInterval(sendSignInInterval);

        client.sendInGameEvent();
        await client.handleGameEvent((data) => data.gameConfigs);
    });

    afterAll(() => {
        client.close();
        client = null;
    });

    it("should settle round correctly", async () => {
        // Arrange
        client.emit(eventTypes.bet, {
            betChoices: { oddEven: { even: 100 } },
        });
        const dataPlaceBet = await client.handleGameEvent((data) => data.endBet);
        client.emit("settle", null);

        // Act
        const dataFinish = await client.handleGameEvent((data) => data.finish);
        const dataStatus = await client.handleGameEvent((data) => data.status);

        // Assert
        expect(dataPlaceBet.endBet).toEqual(100);
        expect(dataFinish.finish.result).toBeGreaterThanOrEqual(0);
        expect(dataFinish.finish.result).toBeLessThanOrEqual(36);
        expect(dataFinish.finish.roundId).toBe(dataPlaceBet.roundId);
        expect(Object.keys(dataFinish.finish.settlementResult)).toEqual(["straightUp", "dozen", "redBlack", "oddEven"]);
        expect(typeof dataStatus.status.bet).toBe("number");
        expect(typeof dataStatus.status.win).toBe("boolean");
    });
});
