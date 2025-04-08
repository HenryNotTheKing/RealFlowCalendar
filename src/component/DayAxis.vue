<template>
  <div class="day-bar" :style=barStyle()>
    <div class="day-label" v-for="(day, index) in days" :key="index" :style="labelStyle()">
      <span style="display: inline-block">{{ day }}</span>
      <div class="date-badge" :class="{ 'current-day': isCurrentDay(index) }">
        {{ weekDates[index].day }}
      </div>
    </div>
  </div>
  <div class="line"></div>
</template>

  
<script setup>
import { defineProps,computed } from 'vue';
import { CanvasParams } from "../stores/CanvasParams.js";

const props = defineProps({
  timeAxisWidth: {
    type: Number,
    default: 100,
  },
  choosenDate: {
    type: Date,
    default: () => new Date(),
  },
});


const useCanvasParams = CanvasParams();
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
  return today.getTime() === weekDates.value[index].timestamp;
};
  // 新增计算属性：获取当前周的全部日期
const weekDates = computed(() => {
  const choosen = props.choosenDate;
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
    return {
      day: date.getDate(),
      timestamp: date.getTime()
    };
  });
});

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
  background-color: #ff4444; /* 红色背景 */
  color: white; /* 白色字体 */
  border-radius: 4px; /* 圆角 */
  text-align:center;
  padding-top: 2px;
  font-size: 14px;
  height: 24px;
  width: 24px;
  margin-left: 2px;
  user-select: none;
}
</style>