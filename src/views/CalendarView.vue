<template>
  <div class="sub-left-panel"></div>
  <div class="sub-center-panel" >
    <DayAxis/>
    <div class="canvas-container-with-axis"> 
      <div class="time-axis">
        <TimeAxis />
      </div>
      <div class="CalendarDisplay" ref="parentRef">
        <CalendarDisplay :canvasWidth="parentWidth" :canvasHeight="parentHeight" /> 
      </div>
    </div>
  </div>
  <div class="sub-right-panel"></div>
</template>

<script setup>
import CalendarDisplay from '../component/CalendarDisplay.vue';
import DayAxis from '../component/DayAxis.vue';
import TimeAxis from '../component/TimeAxis.vue';
import { ref, onMounted,} from 'vue';

const parentRef = ref(null);
const parentWidth = ref(0);
const parentHeight = ref(0);

onMounted(() => {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      parentWidth.value = entry.contentRect.width;
      parentHeight.value = entry.contentRect.height;
    }
  });
  if (parentRef.value) {
    resizeObserver.observe(parentRef.value);
  }

  // 在组件卸载时停止监听
  return () => {
    if (parentRef.value) {
      resizeObserver.unobserve(parentRef.value);
    }
  };
});
</script>

<style scoped>
.canvas-container {
 display: flex; 
}
.canvas-container-with-axis {
  height: 100%;
  width: 100%;
  display: flex;
}
.time-axis {
  width: 5%;
}
.CalendarDisplay {
  width: 95%;
}
.day-axis {
  display: block
}
</style>
