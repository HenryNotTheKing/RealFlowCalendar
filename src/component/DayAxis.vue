<template>
  <div class="day-bar" :style=barStyle()>
    <div class="day-label" v-for="(day, index) in days" :key="index" :style="labelStyle()">
      <span style="display: inline-block">{{ day }}</span>
      <div class="date-badge" :class="{ 'current-day': isCurrentDay(index) }">
        {{ useDateDisplay.selectedDateArr[index].getDate()}}
      </div>
    </div>
  </div>
  <div class="line"></div>
</template>

  
<script setup>
import { computed } from 'vue';
import { CanvasParams } from "../stores/CanvasParams.js";
import { DateDisplay } from "../stores/DateDisplay.js";

const props = defineProps({
  timeAxisWidth: {
    type: Number,
    default: 100,
  },
});


const useCanvasParams = CanvasParams();
const useDateDisplay = DateDisplay();
const timeAxisWidth = computed(() => props.timeAxisWidth);
const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
const barStyle = () => ({
  left: `${timeAxisWidth.value}px`,
})
const labelStyle = () => ({
  width: `${useCanvasParams.colWidth}px`,
})

const isCurrentDay = (index) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() === useDateDisplay.selectedDateArr[index].getTime();
};
</script>
  
<style scoped>
.day-bar {
 display: flex; 
 position: relative;
 bottom: 2px;
}
.day-label {
  text-align: center;
  font-size: 16px;
  color: #868686;
  display:flex;
  justify-content: center;
  width: 100%;
  user-select: none;
}
 .line{
    background: #F1F1F1;
    height: 1px;
 }

 .date-badge {
  display: inline-block;
  text-align: center;
  min-width: 24px;
}
.current-day {
  background-color: #F04842; /* 红色背景 */
  color: white; /* 白色字体 */
  border-radius: 4px; /* 圆角 */
  text-align:center;
  padding-top: 2px;
  font-size: 14px;
  height: 24px;
  width: 24px;
  margin-left: 2px;
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0 4px 0;
}
</style>