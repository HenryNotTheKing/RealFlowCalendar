// 获取某一天的周范围（周一到周日）
export const getWeekRange = (date: Date): [Date, Date] => {
  const day = date.getDay(); // 0 (周日) - 6 (周六)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一

  const start = new Date(date);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return [start, end];
};

// 获取ISO周编号（解决跨年周问题）
export const getWeekNumber = (date: Date): number => {
  const target = new Date(date.valueOf());
  const dayNumber = (target.getDay() + 6) % 7; // 将周一设为第一天

  target.setDate(target.getDate() - dayNumber + 3);

  const firstThursday = target.valueOf();
  target.setMonth(0, 1);

  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }

  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

// 生成周缓存Key（格式：YYYY-WW）
export const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeekNumber(date).toString().padStart(2, '0');
  return `${year}-W${week}`;
};

// 处理重复事件（使用rrule.js）
// export function generateRecurringEvents(
//   baseEvent: ScheduleEvent,
//   startDate: Date,
//   endDate: Date
// ): ScheduleEvent[] {
//   if (!baseEvent.recurrence) return [baseEvent];
  
//   const rule = new RRule({
//     freq: RRule[baseEvent.recurrence.type.toUpperCase()],
//     dtstart: baseEvent.start,
//     until: baseEvent.recurrence.endDate ? 
//       new Date(baseEvent.recurrence.endDate) : undefined,
//     interval: baseEvent.recurrence.interval,
//     count: baseEvent.recurrence.endCondition === 'occurrences' ?
//       baseEvent.recurrence.occurrences : undefined,
//     byweekday: baseEvent.recurrence.daysOfWeek
//   });

//   return rule.between(startDate, endDate, true).map(occ => ({
//     ...baseEvent,
//     start: occ,
//     end: new Date(occ.getTime() + (baseEvent.end.getTime() - baseEvent.start.getTime()))
//   }));
// }

