import { controlResultByBet } from "../../../src/helpers/result-control-helper";
import { RouletteBet } from "../../../src/types";
import Constants from "../../../src/constants";

describe("ResultControlHelper", () => {
    describe("controlResultByBet", () => {
        it("should return a number within valid range when winning percentage is 100", () => {
            // Arrange
            const bet: RouletteBet = {
                uid: "test-user",
                name: "test-player",
                straightUp: { "1": 10 },
                dozen: { "1": 20 },
                redBlack: { red: 15 },
                oddEven: { odd: 25 },
                odds: {
                    straightUp: 35,
                    dozen: 2,
                    redBlack: 1,
                    oddEven: 1,
                },
                time: new Date(),
                freeBet: false,
                roundId: 1,
            };
            const winningPercentage = 100;
            const randomMode = 1;

            // Act
            const result = controlResultByBet(bet, winningPercentage, randomMode);

            // Assert
            expect(result).toBeGreaterThanOrEqual(Constants.numberWheel.min);
            expect(result).toBeLessThanOrEqual(Constants.numberWheel.max);
        });
    });
});
