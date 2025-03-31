<template>
  <div class="day-bar"
  :style=labelStyle()
  >
    <div class="day-label"
      v-for="(day, index) in days" :key="index"
    >
      {{ day }} 
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
});
const useCanvasParams = CanvasParams();
const timeAxisWidth = computed(() => props.timeAxisWidth);
  const days =["周一","周二","周三","周四","周五","周六","周日"]
  const labelStyle = () => ({
    gap: `${useCanvasParams.colWidth-48}px`,
    left: `${timeAxisWidth.value}px`,
  })
</script>
  
<style scoped>
.day-bar {
 display: flex; 
 position: relative;
}
.day-label {
  position: relative;
  text-align: center;
  width:48px;
}
 .line{
    background: #AAA;
    height: 1px;
 }

</style>