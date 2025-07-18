import { generateResult, getSettlementResult } from "../../../src/helpers/result-helper";

xdescribe("GenerateResult statistic: 100,000 times", () => {
    // arrange
    const total = 100_000;
    for (let index = 0; index < 3; index++) {
        it(`should generate results statistically correct with mode ${index + 1}`, () => {
            // arrange
            const statisticResult: Record<string, Record<string, number>> = {
                straightUp: {},
                dozen: {},
                redBlack: {},
                oddEven: {},
            };
            // act
            for (let i = 0; i < total; i++) {
                const settlementResult = getSettlementResult(generateResult(index + 1));
                Object.entries(settlementResult).forEach(([betType, betChoices]) => {
                    statisticResult[betType] = statisticResult[betType] ?? {};
                    betChoices.forEach((choice) => {
                        statisticResult[betType][choice] = (statisticResult[betType][choice] ?? 0) + 1;
                    });
                });
            }

            // assert
            const resultPercentage = Object.keys(statisticResult).reduce(
                (percentage: Record<string, Record<string, number>>, betType: string) => {
                    percentage[betType] = Object.keys(statisticResult[betType]).reduce(
                        (percentage: Record<string, number>, choice: string) => {
                            percentage[choice] = +((statisticResult[betType][choice] / total) * 100).toFixed(2);
                            return percentage;
                        },
                        {}
                    );

                    return percentage;
                },
                {}
            );
            console.log(
                `Mode:${index + 1}, countResult: ${JSON.stringify(statisticResult)}, percentageResult: ${JSON.stringify(resultPercentage)}`
            );
            Object.values(resultPercentage.dozen).forEach((percentage) => {
                expect(percentage).toBeGreaterThanOrEqual(32);
                expect(percentage).toBeLessThanOrEqual(35);
            });

            Object.values(resultPercentage.oddEven).forEach((percentage) => {
                expect(percentage).toBeGreaterThan(47);
            });

            Object.values(resultPercentage.redBlack).forEach((percentage) => {
                expect(percentage).toBeGreaterThan(47);
            });

            Object.values(resultPercentage.straightUp).forEach((percentage) => {
                expect(percentage).toBeGreaterThanOrEqual(2);
                expect(percentage).toBeLessThanOrEqual(3);
            });
        });
    }
});
