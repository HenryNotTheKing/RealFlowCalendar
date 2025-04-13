import { ScheduleEvent } from '../types/schedule';
import { defineStore } from 'pinia';
import { getWeekRange, getWeekKey } from '../utils/dataHelper';
import axios from 'axios';
import { RRule } from 'rrule';
import { ref, computed } from 'vue';

export const ScheduleStore = defineStore('schedule', () => {
  const isShowEventForm = ref(false);

  const weeklyCache = ref(new Map<string, ScheduleEvent[]>());
  const currentWeek = ref<ScheduleEvent[]>([]);

  const hasCachedWeek = computed(() => (startDate: Date) => {
    return weeklyCache.value.has(getWeekKey(startDate));
  });

  async function fetchWeekEvents(startDate: Date) {
    const [weekStart, weekEnd] = getWeekRange(startDate);
    const cacheKey = getWeekKey(startDate);

    if (!weeklyCache.value.has(cacheKey)) {
      try {
        const response = await axios.get('/api/events/week', {
          params: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString()
          }
        });
        console.log(weekStart, weekEnd);
        console.log('获取周数据:', response.data);
        weeklyCache.value.set(cacheKey, response.data);
      } catch (error) {
        console.error('获取周数据失败:', error);
      }
    }
    currentWeek.value = weeklyCache.value.get(cacheKey) || [];
  }

  async function addEvent(newEvent: ScheduleEvent) {
    try {
      const response = await axios.post('/api/events', newEvent);
      const savedEvent = response.data;

      const occurrenceWeeks = getEventWeeks(savedEvent);
      occurrenceWeeks.forEach((weekKey: string) => {
        const weekEvents = weeklyCache.value.get(weekKey) || [];
        weeklyCache.value.set(weekKey, [...weekEvents, savedEvent]);
      });

      return savedEvent;
    } catch (error) {
      console.error('创建事件失败:', error);
      throw error;
    }
  }


  // 获取事件影响的周范围
  function getEventWeeks(event: ScheduleEvent): string[] {
    const weeks = new Set<string>();
    const [start, end] = [new Date(event.start), new Date(event.end)];

    //处理重复规则
    function generateRRuleOptions(recurrence: any, start: Date) {
      const options = {
        freq: RRule[recurrence.type.toUpperCase()],
        dtstart: start,
        interval: recurrence.interval,
        ...(recurrence.type === 'weekly' && recurrence.daysOfWeek && {
          byweekday: recurrence.daysOfWeek.map((day: number) => (day + 6) % 7)
        }),
      };

      switch (recurrence.endCondition) {
        case 'untilDate':
          if (!recurrence.endDate) throw new Error('endDate is required for "untilDate"');
          return { ...options, until: new Date(recurrence.endDate) };
        case 'occurrences':
          if (!recurrence.occurrences) throw new Error('occurrences is required for "occurrences"');
          return { ...options, count: recurrence.occurrences };
        case 'never':
          return options;
        default:
          throw new Error(`Invalid endCondition: ${recurrence.endCondition}`);
      }
    }

    if (event.repeat && event.recurrence) {
      const ruleOptions = generateRRuleOptions(event.recurrence, start);
      const rule = new RRule(ruleOptions);
      rule.all().forEach(occurrence => weeks.add(getWeekKey(occurrence)));
    } else {
      const currentDate = new Date(start);
      while (currentDate <= end) {
        weeks.add(getWeekKey(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return Array.from(weeks);
  }

  async function updateEvent(updatedEvent: ScheduleEvent) {
    try {
      // 1. 发送更新请求到后端
      const response = await axios.put(`/api/events/${updatedEvent.id}`, updatedEvent);
      const newEventData = response.data;

      // 2. 获取旧事件影响的周范围
      const oldWeeks = getEventWeeks(updatedEvent); // 注意这里传的是更新前的数据

      // 3. 清理所有旧周中的旧事件数据
      oldWeeks.forEach(weekKey => {
        const weekEvents = weeklyCache.value.get(weekKey) || [];
        const filteredEvents = weekEvents.filter(e => e.id !== updatedEvent.id);
        weeklyCache.value.set(weekKey, filteredEvents);
      });

      // 4. 获取新事件影响的周范围（更新后的数据）
      const newWeeks = getEventWeeks(newEventData);

      // 5. 将新事件添加到新周缓存
      newWeeks.forEach(weekKey => {
        const weekEvents = weeklyCache.value.get(weekKey) || [];
        weeklyCache.value.set(weekKey, [...weekEvents, newEventData]);
      });

      // 6. 更新当前周显示（合并新旧周逻辑不再需要）
      currentWeek.value = currentWeek.value.map(event =>
        event.id === newEventData.id ? newEventData : event
      );

      return newEventData;
    } catch (error) {
      console.error('更新事件失败:', error);
      throw error;
    }
  }

  async function deleteEvent(eventId: string) {
    try {
      // 向后端发送删除请求
      await axios.delete(`/api/events/${eventId}`);

      // 更新所有缓存周
      weeklyCache.value.forEach((events, weekKey) => {
        const filtered = events.filter(event => event.id !== eventId);
        weeklyCache.value.set(weekKey, filtered);
      });

      // 更新当前周显示
      currentWeek.value = currentWeek.value.filter(event => event.id !== eventId);
    } catch (error) {
      console.error('删除事件失败:', error);
      throw error;
    }
  }


  return {
    isShowEventForm,
    weeklyCache,
    currentWeek,
    hasCachedWeek,
    fetchWeekEvents,
    addEvent,
    getEventWeeks,
    updateEvent,
    deleteEvent
  };
});