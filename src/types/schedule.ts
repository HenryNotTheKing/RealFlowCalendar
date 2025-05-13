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

export interface Todoevent{
 id: number;
 title: string;
 待办: TodoTask[];
 进行中: TodoTask[];
 已完成: TodoTask[];
}

export interface TodoTask{
 id: number;
 title: string;
 details: string;
 deadline: Date;
 completed: boolean;
 priority: number;
 status: "待办" | "进行中" | "已完成";
}