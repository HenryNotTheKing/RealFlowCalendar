<template>
  <div class="sub-left-panel">
    <Calendar />
    <div class="divideline_horizontal"></div>
    <catagoryPicker />
  </div>
  <div class="divideline_left"></div>
  <div class="sub-center-panel">
    <div class="date-title">
      <div class="month-title">{{ formatMonth(useDateDisplay.selectedDate) }}</div>
      <div class="year-title">{{ useDateDisplay.selectedDate.getFullYear() }}</div>
      <div class="to-today" @click="useDateDisplay.toToday()">今天</div>
      <div class="arrow-container">
        <div class="arrow-container-left" @click="useDateDisplay.toLastWeek()">
          <img src="../assets/Icons/icon-arrow-left.svg" alt="arrow-left" class="icon" />
        </div>
        <div class="arrow-container-right" @click="useDateDisplay.toNextWeek()">
          <img src="../assets/Icons/icon-arrow-right.svg" alt="arrow-right" class="icon" />
        </div>
      </div>
    </div>
    <DayAxis :timeAxisWidth="timeAxisWidth" />
    <div class="canvas-container-with-axis">
      <div class="time-axis" ref="timeAxisRef">
        <TimeAxis />
      </div>
      <div class="CalendarDisplay" ref="parentRef">
        <CalendarDisplay />
      </div>
    </div>
  </div>
  <div class="sub-right-panel" >
    <div class="divideline_right"></div>
    <EventForm v-if="useScheduleStore.isShowEventForm"/>
  </div>
</template>

<script lang='ts' setup>
import CalendarDisplay from '../component/CalendarDisplay.vue';
import DayAxis from '../component/DayAxis.vue';
import TimeAxis from '../component/TimeAxis.vue';
import Calendar from '../component/Calendar.vue';
import EventForm from '../component/EventForm.vue';
import catagoryPicker from '../component/CatagoryPicker.vue';
import { ref, onMounted} from 'vue';
import { DateDisplay } from '../stores/DateDisplay.js';
import { ScheduleStore } from '../stores/ScheduleStore'
import { CanvasParams } from '../stores/CanvasParams.js';
const useScheduleStore = ScheduleStore();
const useDateDisplay = DateDisplay();
const useCanvasParams = CanvasParams();
function formatMonth(date: { getMonth: () => any; }){
  const month = date.getMonth(); // 月份从0开始，所以需要加1
  const Months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  return Months[month];
}
const parentRef = ref(null);
const timeAxisRef = ref(null);

const timeAxisWidth = ref(0);

async function init() {
  useScheduleStore.updateWeekEvents(useDateDisplay.selectedDate);
  await useScheduleStore.fetchCategories();
  if (useScheduleStore.categories.length === 0) {
    useScheduleStore.createCategory({name: '日程', color: 'Blue'});
  }
}

 onMounted(() => {

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      useCanvasParams.canvasWidth = entry.contentRect.width;
    }
  });
  if (parentRef.value) {
    resizeObserver.observe(parentRef.value);
  }

  const timeAxisObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      timeAxisWidth.value = entry.contentRect.width;
    }
  });
  if (timeAxisRef.value) {
    timeAxisObserver.observe(timeAxisRef.value);
  }

  init();

  // 在组件卸载时停止监听
  return () => {
    if (parentRef.value) {
      resizeObserver.unobserve(parentRef.value);
    }
  };
});

</script>

<style scoped>
.date-title {
  display: flex; 
  align-items: baseline;
  margin-bottom: 1%;
}
.to-today {
  height: 28px;
  width: 48px;
  background-color: #FBFBFB;
  border-radius: 4px;
  margin-left: auto;
  cursor: pointer;
  border: #d4d4d4 1px solid;
  font-size: 14px;
  color: #000000;
  user-select: none;
  box-shadow: 0px 2px 2px rgba(100, 100, 100, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0 4px 0;
  transition: background-color 0.2s ease;
  transform: translateY(13px);
  &:hover {
    background-color: #dbdbdb;
  }
}

.arrow-container {
  display: flex;
  align-items: center;
  margin-left: 5px;
  margin-right: 10px;
  gap: 6px;
  transform: translateY(16px);
}
.arrow-container-left,.arrow-container-right {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: #efefef;
  }
}

.month-title {
 font-size: 30px;
 font-weight: 600;
 margin-left:3%;
 user-select: none;
 margin-right: 5px;
 border-right: 5px;
 align-self: flex-end;
}
.year-title {
  font-size: 24px;
  font-weight: 500;
  user-select: none;
  align-self: flex-end;
}
.canvas-container {
 display: flex; 
}
.canvas-container-with-axis {
  height: 100%;
  width: 100%;
  display: flex;
}
.time-axis {
  width: 36px;
}
.CalendarDisplay {
  width: calc(100% - 36px);
}
.day-axis {
  display: block
}
.icon {
  width: 16px;
  height: 16px;
}

</style>
