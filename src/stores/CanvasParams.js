import { ref } from 'vue'
import { defineStore } from 'pinia'

export const CanvasParams = defineStore('CanvasParams', () => {
  const rowHeight = ref(0)
  const colWidth = ref(0)
  const canvasWidth = ref(0)
  const canvasHeight = ref(0)
  const scrollTop = ref(0)
  const currentTimeCoord = ref(0)
  return {rowHeight, colWidth, scrollTop, currentTimeCoord, canvasWidth, canvasHeight}
})
