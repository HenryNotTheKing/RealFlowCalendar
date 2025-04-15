import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { ScheduleStore } from './ScheduleStore'
import { EventData } from './EventData'


export const DateDisplay = defineStore('DateDisplay', () => {
  const selectedDate = ref(new Date())
  const selectedDateArr = computed(() => {
  const choosen = selectedDate.value;
  const currentDay = choosen.getDay(); // 0=周日, 1=周一...6=周六

  // 计算本周一的日期
  const monday = new Date(choosen);
  monday.setDate(choosen.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  monday.setHours(0, 0, 0, 0); // 设置为午夜时间

  // 生成整周日期数组
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(0, 0, 0, 0); // 设置为午夜时间
    return date
      // day: date.getDate(),
      // timestamp: date.getTime()
  });
});
function toToday() {
  selectedDate.value = new Date();
}
function toNextWeek() {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + 7);
  selectedDate.value = newDate;
}
function toLastWeek() {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() - 7);
  selectedDate.value = newDate;
}

watch(selectedDate, (newDate) => {
  const useScheduleStore = ScheduleStore();
  const useEventData = EventData();
  useScheduleStore.updateWeekEvents(newDate);//矩形的更新也写好了
  console.log('selectedDate changed:', newDate);
  useEventData.selectedIndex = -1;
  useScheduleStore.isShowEventForm = false;
});

  return {selectedDate, selectedDateArr, toToday, toNextWeek, toLastWeek}
})
