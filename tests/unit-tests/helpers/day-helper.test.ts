import { getStartDate, convertToGMTDate } from "../../../src/helpers/day-helper";

describe("DayHelper", () => {
    describe("getStartDate", () => {
        beforeAll(() => {
            jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it("should return a date that is totalDays before today", () => {
            // Arrange
            const totalDays = 3;

            // Act
            const result = getStartDate(totalDays);
            const expectedDate = new Date("2024-12-28T16:00:00.000Z");

            // Assert
            expect(result.toString()).toBe(expectedDate.toString());
        });
    });

    describe("convertToGMTDate", () => {
        it("should convert date to GMT+8 by default", () => {
            // Arrange
            const date = new Date("2023-01-01T12:00:00.000 GMT+0000");
            const expectedDate = new Date("2023-01-01T20:00:00.000 GMT+0000");

            // Act
            const result = convertToGMTDate(date);

            // Assert
            expect(result.toString()).toBe(expectedDate.toString());
        });

        it("should handle custom GMT offset", () => {
            // Arrange
            const date = new Date("2023-01-01T12:00:00.000 GMT+0000");
            const customGMT = 5;
            const expectedDate = new Date("2023-01-01T17:00:00.000 GMT+0000");

            // Act
            const result = convertToGMTDate(date, customGMT);

            // Assert
            expect(result.toString()).toBe(expectedDate.toString());
        });
    });
});
