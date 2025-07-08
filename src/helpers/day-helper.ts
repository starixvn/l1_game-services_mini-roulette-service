const MILLISECONDS_PER_MINUTE = 60 * 1000;

const getTotalOffset = (date: Date, gmt = 8) => {
    const gmt8Offset = gmt * 60;
    const localOffset = date.getTimezoneOffset();
    return gmt8Offset + localOffset;
};

export const getStartDate = (totalDays: number, gmt = 8) => {
    const now = new Date();
    const totalOffset = getTotalOffset(now, gmt);
    const startDate = new Date(now.getTime() + totalOffset * MILLISECONDS_PER_MINUTE);
    startDate.setDate(startDate.getDate() - totalDays);
    startDate.setHours(0, 0, 0, 0);
    return new Date(startDate.getTime() - totalOffset * MILLISECONDS_PER_MINUTE);
};

export const convertToGMTDate = (date: Date, gmt = 8) => {
    const totalOffset = getTotalOffset(date, gmt);
    const localDate = new Date(date.getTime() + totalOffset * MILLISECONDS_PER_MINUTE);
    return localDate;
};
