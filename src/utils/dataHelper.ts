import { ScheduleEvent, RecurrenceRule } from "../types/schedule";
import { DateDisplay } from "../stores/DateDisplay";
import { RRule, Options, RRuleSet, Frequency } from "rrule";
import dayjs from "dayjs";
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


export function getRectPositionFromTimeRange(Event: ScheduleEvent) {
  const useDateDisplay = DateDisplay();
  const startDate = new Date(Event.start);
  const endDate = new Date(Event.end);

  // 查找对应的日期列
  const column = useDateDisplay.selectedDateArr.findIndex(date =>
    date.getDate() === startDate.getDate() &&
    date.getMonth() === startDate.getMonth()
  );

  // 计算起始行数（每15分钟一格）
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const startRow = Math.floor(startMinutes / 15);

  // 计算持续行数（向上取整保证完整显示）
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  const rowCount = durationMinutes / 15;

  return {
    column: Math.max(0, column), // 默认第0列
    startRow: Math.min(95, startRow), // 限制在0-95行范围
    rowCount: Math.min(96 - startRow, rowCount) // 最大到当天结束
  };
}

export class RecurrenceService {
  // 生成指定时间范围内的重复事件
  static generateRecurrenceEvents(
    originalEvent: ScheduleEvent,
    startDate: Date,
    endDate: Date
  ): ScheduleEvent[] {
      // 添加时间范围限制
      const queryEnd = originalEvent.recurrence.endCondition === 'untilDate' && originalEvent.recurrence.endDate
          ? new Date(Math.min(endDate.getTime(), originalEvent.recurrence.endDate.getTime()))
          : endDate;
  
      // 创建包含完整时间范围的规则集
      const ruleSet = new RRuleSet()
      const rrule = this.createRRule(originalEvent)
      ruleSet.rrule(rrule)
  
      // 设置精确的时间范围（包含全天）
      const adjustedStart = dayjs(startDate).startOf('day').toDate()
      const adjustedEnd = dayjs(queryEnd).endOf('day').toDate()
  
      const dates = ruleSet.between(adjustedStart, adjustedEnd, true)
      
      // 添加例外日期过滤逻辑
      const exceptionsSet = new Set(
          originalEvent.exceptions?.map(d => dayjs(d).startOf('day').valueOf()) || []
      );
  
      return dates
          .map(date => this.createEventInstance(originalEvent, date))
          .filter(instance => {
              const instanceDayStart = dayjs(instance.start).startOf('day').valueOf();
              return !exceptionsSet.has(instanceDayStart);
          });
  }
  // 删除单个事件实例
  static deleteOccurrence(
    originalEvent: ScheduleEvent,
    occurrenceDate: Date
  ): ScheduleEvent {
    const exceptions = [...(originalEvent.exceptions || [])]
    exceptions.push(occurrenceDate)

    return {
      ...originalEvent,
      exceptions: [...new Set(exceptions)] // 去重
    }
  }

  // 编辑单个事件实例（转为独立事件）
  static editOccurrence(
    originalEvent: ScheduleEvent,
    editedEvent: ScheduleEvent
  ): { updatedOriginal: ScheduleEvent; independentEvent: ScheduleEvent } {
    // 创建独立事件（深拷贝并解除关联）
    const independentEvent = this.createIndependentEvent(editedEvent)

    // 更新原始事件的例外日期
    const exceptions = [...(originalEvent.exceptions || []), editedEvent.start]
    return {
      updatedOriginal: {
        ...originalEvent,
        exceptions: [...new Set(exceptions)]
      },
      independentEvent
    }
  }

  // 创建独立事件
  private static createIndependentEvent(event: ScheduleEvent): ScheduleEvent {
    return {
      ...event,
      id: crypto.randomUUID(),
      originalEventId: '',
      repeat: false,
      recurrence: {} as RecurrenceRule,
      exceptions: []
    }
  }



  // 创建RRule实例
  private static createRRule(event: ScheduleEvent): RRule {
    const options: Partial<Options> = {
        dtstart: event.start,
        freq: this.getFrequency(event.recurrence.type),
        interval: event.recurrence.interval,
    }

    // 处理星期规则
    if (event.recurrence.daysOfWeek) {
      options.byweekday = event.recurrence.daysOfWeek.map(day => 
          [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA][day]
      )
  }

    switch (event.recurrence.endCondition) {
      case 'untilDate':
        options.until = event.recurrence.endDate
        break
      case 'occurrences':
        options.count = event.recurrence.occurrences
        break
    }

    return new RRule(options)
  }

  // 检查时间冲突
  private static hasConflict(
    instance: ScheduleEvent,
    allEvents: ScheduleEvent[]
  ): boolean {
    return allEvents.some(e =>
      !e.originalEventId && // 只检查独立事件
      dayjs(e.start).isSame(instance.start, 'day') &&
      e.id !== instance.id
    )
  }

  // 检查是否为手动排除的实例
  private static isException(
    instance: ScheduleEvent,
    original: ScheduleEvent
  ): boolean {
    return original.exceptions?.some(ex =>
      dayjs(ex).isSame(instance.start, 'day')
    ) || false
  }
  // 创建事件实例
  private static createEventInstance(
    original: ScheduleEvent,
    date: Date
  ): ScheduleEvent {
    const duration = dayjs(original.end).diff(original.start)
    const newClone = {
      ...original,
      start: date,
      end: dayjs(date).add(duration, 'ms').toDate(),
      originalEventId: original.id,
      repeat: false, // 生成的实例不再重复
    }
    return {
      ...newClone,
      lastState: newClone
    }
  }

  // 获取频率枚举
  private static getFrequency(type: RecurrenceRule['type']): Frequency {
    return {
      daily: RRule.DAILY,
      weekly: RRule.WEEKLY,
      monthly: RRule.MONTHLY,
      yearly: RRule.YEARLY
    }[type]
  }
}

