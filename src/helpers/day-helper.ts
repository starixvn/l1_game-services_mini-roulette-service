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
    return new Date(date.getTime() + totalOffset * MILLISECONDS_PER_MINUTE);
};


export const getWeekRange = (date: Date, gmt = 8) => {
    const totalOffset = getTotalOffset(date, gmt);
    const gmtDate = new Date(date.getTime() + totalOffset * MILLISECONDS_PER_MINUTE);

    const dayOfWeek = gmtDate.getDay();

    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekStart = new Date(gmtDate);
    weekStart.setDate(gmtDate.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
  
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const start = new Date(weekStart.getTime() - totalOffset * MILLISECONDS_PER_MINUTE);
    const end = new Date(weekEnd.getTime() - totalOffset * MILLISECONDS_PER_MINUTE);
    
    return { start, end };
};
