import { generateResult } from "../result-helper";

describe("generateResult", () => {
    const modes = [1, 2, 3];

    it.each(modes)("mode %s: max frequency difference of numbers should under 0.004", (testCase) => {
        // arrange
        const totalRounds = 100_000;
        const totalNumber = 37;
        const frequencies = new Array(totalNumber).fill(0);
        const acceptedDiff = 0.004;

        // act
        for (let index = 0; index < totalRounds; index++) {
            const result = generateResult(testCase);
            frequencies[result]++;
        }

        // assert
        const min = Math.min(...frequencies);
        const max = Math.max(...frequencies);
        expect((max - min) / totalRounds <= acceptedDiff).toBeTrue();
        console.log(`mode ${testCase}`, frequencies);
    });
});
