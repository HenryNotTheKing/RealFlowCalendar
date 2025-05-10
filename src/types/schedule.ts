export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];        // 0-6（周日到周六）
  endCondition: 'never' | 'untilDate' | 'occurrences';
  occurrences?: number;
  endDate?: Date;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  category: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string;
  description: string;
  repeat: boolean;
  recurrence: RecurrenceRule;
  originalEventId?: string;
  exceptions?: Date[];
  lastState?: ScheduleEvent
}

export interface Rect {
  column: number;
  startRow: number;
  rowCount: number;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface EventSet  {
  ids: Set<string>;
  events: Map<string, ScheduleEvent>;
}