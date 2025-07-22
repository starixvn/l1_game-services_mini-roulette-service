import {
    generateChoiceByNumber,
    getBetChoicesGroupByNumbers,
    getBetChoicesGroupByTypes,
    buildBetAmountIncrement,
    trackBetChoices,
} from "../../../src/helpers/choice-helper";

describe("ChoiceHelper", () => {
    describe("generateChoiceByNumber", () => {
        it("should generate correct choices for a red number", () => {
            // Arrange
            const number = 1; // Red number

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.straightUp).toEqual(["1"]);
            expect(result.dozen).toEqual(["1"]);
            expect(result.redBlack).toEqual(["red"]);
            expect(result.oddEven).toEqual(["odd"]);
        });

        it("should generate correct choices for a black number", () => {
            // Arrange
            const number = 2; // Black number

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.straightUp).toEqual(["2"]);
            expect(result.dozen).toEqual(["1"]);
            expect(result.redBlack).toEqual(["black"]);
            expect(result.oddEven).toEqual(["even"]);
        });

        it("should generate correct choices for zero", () => {
            // Arrange
            const number = 0;

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.straightUp).toEqual(["0"]);
            expect(result.dozen).toEqual([]);
            expect(result.redBlack).toEqual([]);
            expect(result.oddEven).toEqual([]);
        });

        it("should generate correct dozen choices for first dozen", () => {
            // Arrange
            const number = 5; // First dozen (1-12)

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.dozen).toEqual(["1"]);
        });

        it("should generate correct dozen choices for second dozen", () => {
            // Arrange
            const number = 15; // Second dozen (13-24)

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.dozen).toEqual(["2"]);
        });

        it("should generate correct dozen choices for third dozen", () => {
            // Arrange
            const number = 30; // Third dozen (25-36)

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.dozen).toEqual(["3"]);
        });

        it("should generate correct odd/even choices for odd number", () => {
            // Arrange
            const number = 7;

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.oddEven).toEqual(["odd"]);
        });

        it("should generate correct odd/even choices for even number", () => {
            // Arrange
            const number = 8;

            // Act
            const result = generateChoiceByNumber(number);

            // Assert
            expect(result.oddEven).toEqual(["even"]);
        });
    });

    describe("getBetChoicesGroupByNumbers", () => {
        it("should return array with correct length", () => {
            // Act
            const result = getBetChoicesGroupByNumbers();

            // Assert
            expect(result).toHaveLength(37);
        });

        it("should include choices for all numbers from 0 to max", () => {
            // Act
            const result = getBetChoicesGroupByNumbers();

            // Assert
            expect(result[0].straightUp).toEqual(["0"]);
            expect(result[36].straightUp).toEqual(["36"]);
        });

        it("should have consistent structure for all elements", () => {
            // Act
            const result = getBetChoicesGroupByNumbers();

            // Assert
            result.forEach((choices) => {
                expect(Object.keys(choices)).toEqual(["straightUp", "dozen", "redBlack", "oddEven"]);
                expect(choices.straightUp).toBeInstanceOf(Array);
                expect(choices.dozen).toBeInstanceOf(Array);
                expect(choices.redBlack).toBeInstanceOf(Array);
                expect(choices.oddEven).toBeInstanceOf(Array);
            });
        });
    });

    describe("getBetChoicesGroupByTypes", () => {
        it("should return expected", () => {
            // Arrange
            const straightUp = Array.from({ length: 37 }, (_, i) => i.toString()).sort();

            // Act
            const result = getBetChoicesGroupByTypes();

            // Assert
            expect(Object.keys(result)).toEqual(["straightUp", "dozen", "redBlack", "oddEven"]);
            expect(result.straightUp).toEqual(straightUp);
            expect(result.dozen).toEqual(["1", "2", "3"]);
            expect(result.redBlack).toEqual(["black", "red"]);
            expect(result.oddEven).toEqual(["even", "odd"]);
        });
    });

    describe("buildBetAmountIncrement", () => {
        it("should flatten nested bet choices structure", () => {
            // Arrange
            const betChoices = {
                straightUp: { "1": 10, "2": 20 },
                redBlack: { red: 15, black: 25 },
            };

            // Act
            const result = buildBetAmountIncrement(betChoices);

            // Assert
            expect(result).toEqual({
                "straightUp.1": 10,
                "straightUp.2": 20,
                "redBlack.red": 15,
                "redBlack.black": 25,
            });
        });

        it("should handle empty bet choices", () => {
            // Arrange
            const betChoices = {};

            // Act
            const result = buildBetAmountIncrement(betChoices);

            // Assert
            expect(result).toEqual({});
        });

        it("should handle single bet type with multiple choices", () => {
            // Arrange
            const betChoices = {
                dozen: { "1": 5, "2": 10, "3": 15 },
            };

            // Act
            const result = buildBetAmountIncrement(betChoices);

            // Assert
            expect(result).toEqual({
                "dozen.1": 5,
                "dozen.2": 10,
                "dozen.3": 15,
            });
        });
    });

    describe("trackBetChoices", () => {
        it("should add bet amounts to tracks when reduce is false", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {};
            const betChoices = {
                straightUp: { "1": 10, "2": 20 },
                redBlack: { red: 15 },
            };
            const rate = 1;

            // Act
            trackBetChoices(tracks, betChoices, rate, false);

            // Assert
            expect(tracks.straightUp["1"]).toBe(10);
            expect(tracks.straightUp["2"]).toBe(20);
            expect(tracks.redBlack.red).toBe(15);
        });

        it("should subtract bet amounts from tracks when reduce is true", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {
                straightUp: { "1": 50, "2": 30 },
                redBlack: { red: 25 },
            };
            const betChoices = {
                straightUp: { "1": 10, "2": 20 },
                redBlack: { red: 15 },
            };
            const rate = 1;

            // Act
            trackBetChoices(tracks, betChoices, rate, true);

            // Assert
            expect(tracks.straightUp["1"]).toBe(40);
            expect(tracks.straightUp["2"]).toBe(10);
            expect(tracks.redBlack.red).toBe(10);
        });

        it("should apply rate multiplier to bet amounts", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {};
            const betChoices = {
                straightUp: { "1": 10 },
            };
            const rate = 2;

            // Act
            trackBetChoices(tracks, betChoices, rate, false);

            // Assert
            expect(tracks.straightUp["1"]).toBe(20);
        });

        it("should remove choice when amount becomes zero", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {
                straightUp: { "1": 10 },
            };
            const betChoices = {
                straightUp: { "1": 10 },
            };
            const rate = 1;

            // Act
            trackBetChoices(tracks, betChoices, rate, true);

            // Assert
            expect(tracks.straightUp["1"]).toBeUndefined();
        });

        it("should handle null or undefined betChoices gracefully", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {};
            const rate = 1;

            // Act & Assert
            expect(() => trackBetChoices(tracks, null as any, rate, false)).not.toThrow();
            expect(() => trackBetChoices(tracks, undefined as any, rate, false)).not.toThrow();
        });

        it("should initialize track type if it doesn't exist", () => {
            // Arrange
            const tracks: Record<string, Record<string, number>> = {};
            const betChoices = {
                straightUp: { "1": 10 },
            };
            const rate = 1;

            // Act
            trackBetChoices(tracks, betChoices, rate, false);

            // Assert
            expect(tracks.straightUp).toBeDefined();
            expect(tracks.straightUp["1"]).toBe(10);
        });
    });
});
