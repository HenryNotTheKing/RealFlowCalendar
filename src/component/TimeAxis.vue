<template>
  <div class="time-axis">
    <div 
      v-for="hour in 23"
      :key="hour"
      class="time-label"
      :style="labelStyle(hour)"
    >
      {{ formatTime(hour) }}
    </div>
    <div class="current-time-block" :style="currentTimeStyle">{{currentHour}}:{{currentMinute.toString().padStart(2, '0')}}</div>
  </div>

</template>

<script setup>
import { ref,computed } from 'vue';
import { CanvasParams } from "../stores/CanvasParams.js";

const useCanvasParams = CanvasParams();
const currentTime = ref(new Date());
const currentHour = computed(() => currentTime.value.getHours());
const currentMinute = computed(() => currentTime.value.getMinutes());
// 时间格式转换
const formatTime = (hour) => {
  return `${String(hour)}:00`;
};

// 动态样式计算
const labelStyle = computed(() => (hour) => ({
  top: `${hour * useCanvasParams.rowHeight - useCanvasParams.scrollTop}px`,
  height: `${useCanvasParams.rowHeight}px`,
  lineHeight: `${useCanvasParams.rowHeight}px`
}));
useCanvasParams.currentTimeCoord = computed(() => {
  return currentHour.value * useCanvasParams.rowHeight + currentMinute.value*(useCanvasParams.rowHeight/60)- useCanvasParams.scrollTop;
})
const currentTimeStyle = computed(() => ({
  top: `${useCanvasParams.currentTimeCoord}px`,
}))
</script>

<style scoped>
.time-axis {
  position: relative;
  height: 100%;
  min-width: 100%;
}

.time-label {
  position: absolute;
  color: #999999;  /* 浅灰色 */
  font-size: 12px;
  text-align: right;
  right: 4px;
  white-space: nowrap;
  transform: translateY(-50%);
  pointer-events: none;
  user-select: none;
}

.current-time-block {
  position: absolute;
  top: 50%;                   
  transform: translateY(-50%);
  text-align: right;
  right: 4px;
  height: 24px;  /* 线的高度 */
  width: 36px;
  border-radius: 4px;
  background-color: red;  /* 线的颜色 */
  font-size: 12px;
  color: white;
  display: flex;
  align-items: center;    /* 垂直居中 */
  justify-content: center; /* 水平居中 */
}
</style>