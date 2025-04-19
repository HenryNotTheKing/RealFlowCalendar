import { ScheduleEvent, Category } from '../types/schedule';
import { defineStore } from 'pinia';
import { getWeekRange, getWeekKey, getRectPositionFromTimeRange} from '../utils/dataHelper';
import axios from 'axios';
import { RRule } from 'rrule';
import { ref, computed } from 'vue';
import { EventData } from './EventData';


export const ScheduleStore = defineStore('schedule', () => {
  const isShowEventForm = ref(false);
  const isOperatingForm = ref(false);
  
  const weeklyCache = ref(new Map<string, ScheduleEvent[]>());
  const currentWeek = ref<ScheduleEvent[]>([]);

  const categories = ref<Category[]>([]);
  const options = computed(() =>
    categories.value.map(item => ({
        value: item.name,
        label: item.name
    }))
)

  const hasCachedWeek = computed(() => (currentDate: Date) => {
    return weeklyCache.value.has(getWeekKey(currentDate));
  });

  async function fetchWeekEvents(currentDate: Date) {
    const [weekStart, weekEnd] = getWeekRange(currentDate);
    const cacheKey = getWeekKey(currentDate);

    if (!weeklyCache.value.has(cacheKey)) {
      try {
        const response = await axios.get('/api/events/week', {
          params: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString()
          }
        });
        console.log('获取周数据:', response.data);
        weeklyCache.value.set(cacheKey, response.data);
      } catch (error) {
        console.error('获取周数据失败:', error);
      }
    }
    currentWeek.value = weeklyCache.value.get(cacheKey) || [];
    return currentWeek.value;
  }

  async function addEvent(newEvent: ScheduleEvent) {
    try {
      const payload = {
        ...newEvent,
        start: newEvent.start.toISOString(),
        end: newEvent.end.toISOString(),
        id: newEvent.id,
      };
      console.log('添加事件:', payload);
      const response = await axios.post('/api/events', payload);
      const savedEvent = response.data;
      const occurrenceWeeks = getEventWeeks(savedEvent);
      occurrenceWeeks.forEach((weekKey: string) => {
        const weekEvents = weeklyCache.value.get(weekKey) || [];
        weeklyCache.value.set(weekKey, [...weekEvents, savedEvent]);
      });
      console.log('添加事件成功:', savedEvent);
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

  async function updateEvent(newEvent: ScheduleEvent) {
    try {
      // 1. 发送更新请求到后端
      const payload = {
        ...newEvent,
        start: newEvent.start.toISOString(),
        end: newEvent.end.toISOString()
      };
      const response = await axios.put(`/api/events/${newEvent.id}`, payload);
      const newEventData = response.data;

      // 2. 获取旧事件影响的周范围
      const oldWeeks = getEventWeeks(newEvent); // 注意这里传的是更新前的数据

      // 3. 清理所有旧周中的旧事件数据
      oldWeeks.forEach(weekKey => {
        const weekEvents = weeklyCache.value.get(weekKey) || [];
        const filteredEvents = weekEvents.filter(e => e.id !== newEvent.id);
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

  // 问题1：未清空旧数据导致残留
  async function fetchWeekEventsFromBackend(currentDate: Date) {
      try {
          const useEventData = EventData();
          const currentWeekEvents = await fetchWeekEvents(currentDate);
          if (currentWeekEvents) {
              // 正确做法：先清空再填充
              useEventData.currentWeekEvents = [...currentWeekEvents]; // 创建新数组
              useEventData.currentRects = currentWeekEvents.map(event => 
                  getRectPositionFromTimeRange(event)
              );
          }
      } catch(error) {
          console.error('初始化周显示失败:', error);
      }
  }
  
  // 问题2：未处理缓存不存在的情况
  function fetchWeekEventsFromCache(currentDate: Date) {
      const useEventData = EventData();
      const weekKey = getWeekKey(currentDate);
      const cachedWeekEvents = weeklyCache.value.get(weekKey);
      
      // 正确做法：添加空状态处理
      useEventData.currentWeekEvents = cachedWeekEvents || [];
      useEventData.currentRects = cachedWeekEvents 
          ? cachedWeekEvents.map(getRectPositionFromTimeRange)
          : [];
  }

  async function updateWeekEvents(currentDate: Date) {
    try {
      const weekkey = getWeekKey(currentDate);
      if (weeklyCache.value.has(weekkey)) {
       fetchWeekEventsFromCache(currentDate); 
      }
      else {
        fetchWeekEventsFromBackend(currentDate); 
      }
    }
    catch (error) {
      console.error('更新周事件失败:', error);
      throw error;

    }
  }
  function clearWeekCache(event: ScheduleEvent) {
    const weeks = getEventWeeks(event);
    const useEventData = EventData();
    weeks.forEach(weekKey => {
      weeklyCache.value.delete(weekKey)
    })
    useEventData.currentWeekEvents = []       // 清空当前显示的事件
}

const fetchCategories = async () => {
  try {
    const response = await axios.get('/api/categories');
    // 添加数据校验
    if (!Array.isArray(response.data)) {
      throw new Error('无效的分类数据格式');
    }
    
    categories.value = response.data.map((c: any) => ({
      id: c.id,
      name: c.name || '新类别', // 防止空值
      color: c.color || 'Blue',  // 添加默认颜色
      displayName: c.displayName || '新类别' // 添加显示名称
    }));
  } catch (error) {
    console.error('获取分类失败:', error);
    // 可以添加用户通知
  }
};
// 创建分类（带临时ID和回滚机制）
const createCategory = async (payload: Omit<Category, 'id'>) => {
  const tempId = -Date.now(); // 生成临时ID
  const tempCategory = { ...payload, id: tempId };
  
  try {
    // 立即添加临时分类
    categories.value.push(tempCategory);
    
    // 发送请求
    const response = await axios.post('/api/categories', payload);
    const savedCategory = response.data;

    // 替换临时分类
    const index = categories.value.findIndex(c => c.id === tempId);
    if (index !== -1) {
      categories.value[index] = savedCategory;
    }
    
    return savedCategory;
  } catch (error) {
    // 回滚删除临时分类
    categories.value = categories.value.filter(c => c.id !== tempId);
    console.error('创建分类失败:', error);
    throw error;
  }
};

// 更新分类（带状态回滚）
const updateCategory = async (id: number, updates: Partial<Category>) => {
  const original = categories.value.find(c => c.id === id);
  if (!original) return;

  try {
    // 立即应用更新
    const updated = { ...original, ...updates };
    const index = categories.value.findIndex(c => c.id === id);
    if (index !== -1) {
      categories.value[index] = updated;
    }

    await axios.put(`/api/categories/${id}`, updates);
  } catch (error) {
    // 恢复原始状态
    if (original) {
      const index = categories.value.findIndex(c => c.id === id);
      if (index !== -1) {
        categories.value[index] = original;
      }
    }
    console.error('更新分类失败:', error);
    throw error;
  }
};

// 删除分类（带恢复机制）
const deleteCategory = async (id: number) => {
  const backup = categories.value.find(c => c.id === id);
  
  try {
    // 立即删除
    categories.value = categories.value.filter(c => c.id !== id);
    
    await axios.delete(`/api/categories/${id}`);
  } catch (error) {
    // 恢复数据
    if (backup) {
      categories.value.push(backup);
    }
    console.error('删除分类失败:', error);
    throw error;
  }
};

  return {
    isShowEventForm,
    isOperatingForm,
    weeklyCache,
    currentWeek,
    hasCachedWeek,
    categories,
    options,
    fetchWeekEvents,
    addEvent,
    getEventWeeks,
    updateEvent,
    deleteEvent,
    updateWeekEvents,
    clearWeekCache,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
});