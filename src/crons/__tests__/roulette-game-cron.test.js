import RouletteGameCron from "../roulette-game-cron";
import gameSettings from "../../game-settings";

describe("isStartingTime tests", () => {
    it("remaining time = place bet time + shake time, should re turn true", () => {
        const { durations } = gameSettings;
        const gameCron = new RouletteGameCron({});
        const result = gameCron.isStartingTime(durations.placingBets + durations.shakeThePlateDuration, durations);
        expect(result).toBeTrue();
    });
});
