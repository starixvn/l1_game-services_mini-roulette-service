import { generateResult, getSettlementResult } from "../../../src/helpers/result-helper";
import { ChoiceHelper } from "../../../src/helpers";
import Constants from "../../../src/constants";

// Mock the ChoiceHelper
jest.mock("../../../src/helpers", () => ({
    ChoiceHelper: {
        generateChoiceByNumber: jest.fn(),
    },
}));

describe("ResultHelper", () => {
    describe("generateResult", () => {
        it("should generate a result within the valid range for random mode 1", () => {
            // Arrange
            const randomMode = 1;

            // Act
            const result = generateResult(randomMode);

            // Assert
            expect(result).toBeGreaterThanOrEqual(Constants.numberWheel.min);
            expect(result).toBeLessThanOrEqual(Constants.numberWheel.max);
        });

        it("should generate a result within the valid range for random mode 2", () => {
            // Arrange
            const randomMode = 2;

            // Act
            const result = generateResult(randomMode);

            // Assert
            expect(result).toBeGreaterThanOrEqual(Constants.numberWheel.min);
            expect(result).toBeLessThanOrEqual(Constants.numberWheel.max);
        });

        it("should generate a result within the valid range for random mode 3", () => {
            // Arrange
            const randomMode = 3;

            // Act
            const result = generateResult(randomMode);

            // Assert
            expect(result).toBeGreaterThanOrEqual(Constants.numberWheel.min);
            expect(result).toBeLessThanOrEqual(Constants.numberWheel.max);
        });

        it("should fallback to random mode 1 when invalid random mode is provided", () => {
            // Arrange
            const invalidRandomMode = 999;

            // Act
            const result = generateResult(invalidRandomMode);

            // Assert
            expect(result).toBeGreaterThanOrEqual(Constants.numberWheel.min);
            expect(result).toBeLessThanOrEqual(Constants.numberWheel.max);
        });

        it("should generate results that are integers", () => {
            // Arrange
            const randomMode = 1;

            // Act
            const result = generateResult(randomMode);

            // Assert
            expect(Number.isInteger(result)).toBe(true);
        });
    });

    describe("getSettlementResult", () => {
        it("should call ChoiceHelper.generateChoiceByNumber with the provided round result", () => {
            // Arrange
            const roundResult = 15;
            const mockSettlementResult = {
                straightUp: ["15"],
                dozen: ["2"],
                redBlack: ["black"],
                oddEven: ["odd"],
            };
            (ChoiceHelper.generateChoiceByNumber as jest.Mock).mockReturnValue(mockSettlementResult);

            // Act
            const result = getSettlementResult(roundResult);

            // Assert
            expect(ChoiceHelper.generateChoiceByNumber).toHaveBeenCalledWith(roundResult);
            expect(result).toBe(mockSettlementResult);
        });
    });
});
