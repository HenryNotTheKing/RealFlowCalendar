<template>
  <div
      class="canvas-container"
      ref="container"
      :width="canvasWidth"
      :height="canvasHeight"
  >
      <svg
          class="draw-canvas"
          :width="canvasWidth"
          :height="canvasHeight"
          @mousedown="startInteraction"
          @mousemove="handleMove"
          @mouseup="stopInteraction"
          @mouseleave="cancelInteraction"
          @wheel="handleWheel"
      >
          <!-- 网格系统 -->
          <line
              v-for="x in verticalTicks"
              :key="'vline-' + x"
              :x1="x"
              :y1="0"
              :x2="x"
              :y2="canvasHeight"
              class="grid-line vertical"
          />
          <line
              v-for="y in horizontalTicks"
              :key="'hline-' + y"
              :x1="0"
              :y1="y"
              :x2="canvasWidth"
              :y2="y"
              class="grid-line horizontal"
          />
          <line
            class="current-time-line" 
            :y1="useCanvasParams.currentTimeCoord+useCanvasParams.scrollTop" 
            :y2="useCanvasParams.currentTimeCoord+useCanvasParams.scrollTop" 
            :x1="0" 
            :x2="canvasWidth" 
            stroke=#FAC8C6 
            stroke-width="1"
          />

          <!-- 已绘制矩形 -->
          <rect
              v-for="(rect, index) in rects"
              :key="'rect-' + index"
              :x="getRectPosition(rect).x"
              :y="getRectPosition(rect).y"
              :width="getRectPosition(rect).width"
              :height="getRectPosition(rect).height"
              rx="8"
              ry="8"
              class="final-rect"
              :class="{
                  dragging: interactionMode === 'drag' && activeRectIndex === index,
                  resizing: interactionMode === 'resize',
                  selected: selectedRectIndex === index
              }"
              @mousemove="handleRectHover($event, index)"
              @mouseleave="resetRectHoverCursor"
              @mousedown="startInteraction($event)"
              @click="selectRect(index)"
          />
          <path
              v-for="(rect, index) in rects"
              :class="{ 'hide-stripe': interactionMode === 'drag' && activeRectIndex === index }"
              :key="'stripe-' + index"
              :d="getStripePath(rect)"
              class="rect-stripe"
              pointer-events="none"
          />
          <!-- 预览矩形 -->
          <rect
              v-if="interactionMode === 'draw' && validHeight"
              :x="currentColumn * colWidth"
              :y="Math.min(startRow, currentRow) * rowHeight"
              :width="colWidth*0.9"
              :height="Math.abs(currentRow - startRow) * rowHeight"
              rx="8"
              ry="8"
              class="preview-rect"
          />

      </svg>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { CanvasParams } from "../stores/CanvasParams.js";
import { DateDisplay } from "../stores/DateDisplay.js";
import { ScheduleStore } from '../stores/ScheduleStore'
import { EventData } from '../stores/EventData.js';
import { ScheduleEvent } from '../types/schedule.js';

interface Rect {
  column: number;
  startRow: number;
  rowCount: number;
}

// 容器引用
const container = ref<HTMLElement|null>(null);

// 画布配置
const useCanvasParams = CanvasParams();
const useDateDisplay = DateDisplay();
const useScheduleStore = ScheduleStore();
const useEventData = EventData();

const props = defineProps({
  canvasWidth: { type: Number, default: 1200 },
  canvasHeight: { type: Number, default: 960 }
});
const canvasWidth = computed(() => props.canvasWidth );
const rowHeight = ref<number>(20);
const containerHeight = ref<number>(0);
const minRowHeight = computed(() => containerHeight.value / 96);
const canvasHeight = computed(() => Math.max(
  rowHeight.value * 96,  // 原有行高计算
  containerHeight.value  // 新增容器高度限制
));
const maxRowHeight = 50;
const colWidth = computed(() => canvasWidth.value / 7);

//矩形圆角绘制
function getStripePath(rect: any) {
      const pos = this.getRectPosition(rect);
      const x = pos.x;
      const y = pos.y;
      const height = pos.height;
      const rx = 6; // 与原矩形圆角一致
      // 构造路径：左侧圆角，右侧直角
      return `M ${x} ${y + rx} 
          A ${rx} ${rx} 0 0 1 ${x + rx} ${y} 
          V ${y + height} 
          A ${rx} ${rx} 0 0 1 ${x} ${y + height - rx} 
          V ${y + rx} 
          Z`;
    }

//检测鼠标滚动
onMounted(() => {
  const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
          containerHeight.value = entries[0].contentRect.height;
      }
  });

  if (container.value) {
      resizeObserver.observe(container.value);
  }
  
  container.value?.addEventListener('scroll', handleScroll);

  window.addEventListener('keydown', handleKeyDown);
});


// 新增自动行高调整逻辑
watch(containerHeight, (newHeight) => {
  const requiredMinHeight = newHeight / 96;
  if (rowHeight.value < requiredMinHeight) {
      rowHeight.value = requiredMinHeight;
  }
});

const handleScroll = () => {
    if (container.value) {
      useCanvasParams.scrollTop = container.value.scrollTop;
    }
  };


// 网格系统
const verticalTicks = computed(() =>
  Array.from({ length: 9 }, (_, i) => i * colWidth.value)
);
const horizontalTicks = computed(() =>
  Array.from({ length: 25 }, (_, i) => i * rowHeight.value * 4)
);

// 交互状态
const interactionMode = ref<'draw' | 'drag' | 'resize' | null>(null);
const activeRectIndex = ref(-1);
const resizeEdge = ref< 'top' | 'bottom' | null >(null);
const startRow = ref(0);
const currentRow = ref(0);
const currentColumn = ref(0);
const rects = ref<Rect[]>([]);
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);
const selectedRectIndex = ref(-1);//用于处理拖动

const clickStartPosition = ref({ x: 0, y: 0 });// 鼠标点击事件处理

// 有效性检查
const validHeight = computed(() => Math.abs(currentRow.value - startRow.value) > 0);

// 修改坐标对齐函数
const alignToGrid = (clientY: number) => {
  if (!container.value) return 0;
  const rect = container.value.getBoundingClientRect();
  const rawY = clientY - rect.top + container.value.scrollTop;
  return Math.min(95, Math.max(0, Math.floor(
      (rawY + rowHeight.value / 2) / rowHeight.value
  )));
};

const alignToColumn = (clientX: number) => {
  if (!container.value) return 0;
  const rect = container.value.getBoundingClientRect();
  const rawX = clientX - rect.left + container.value.scrollLeft;
  return Math.min(6, Math.max(0, Math.round(
      (rawX - colWidth.value / 2) / colWidth.value
  )));
};

const getRectPosition = (rect: Rect) => ({
  x: rect.column * colWidth.value,
  width: colWidth.value*0.9,
  y: rect.startRow * rowHeight.value,
  height: rect.rowCount * rowHeight.value
});


const getRectTimeRange = (rect: Rect) => {
  const startTime = new Date(useDateDisplay.selectedDateArr[rect.column]);
  
  // 计算起始时间（基准日期 + 起始行数 * 15分钟）
  startTime.setHours(0, rect.startRow * 15, 0, 0);
  
  // 计算结束时间（起始时间 + 行数 * 15分钟）
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + rect.rowCount * 15);

  return {
        start: startTime,
        end: endTime,
        title: '新事件',
  };
}

function getRectPositionFromTimeRange(Event: ScheduleEvent) {
  const startDate = new Date(Event.start);
  const endDate = new Date(Event.end);
  
  // 查找对应的日期列
  const column = useDateDisplay.selectedDateArr.findIndex(date => 
    date.getDate() === startDate.getDate() &&
    date.getMonth() === startDate.getMonth()
  );

  // 计算起始行数（每15分钟一格）
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const startRow = Math.floor(startMinutes / 15);

  // 计算持续行数（向上取整保证完整显示）
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  const rowCount = Math.ceil(durationMinutes / 15);

  return {
    column: Math.max(0, column), // 默认第0列
    startRow: Math.min(95, startRow), // 限制在0-95行范围
    rowCount: Math.min(96 - startRow, rowCount) // 最大到当天结束
  };
}
// 矩形悬停处理
function handleRectHover(event: { clientY: number; }, index: number) {
  if (interactionMode.value) return;
  if (!container.value) return;
  const rect = container.value.getBoundingClientRect();
  const mouseY = event.clientY - rect.top + container.value.scrollTop;
  const targetRect = rects.value[index];

  const rectTop = targetRect.startRow * rowHeight.value;
  const rectBottom = rectTop + targetRect.rowCount * rowHeight.value;

  const edgeThreshold = 8;
  if (Math.abs(mouseY - rectTop) < edgeThreshold) {
      container.value.style.cursor = 'ns-resize';
      return;
  }

  if (Math.abs(mouseY - rectBottom) < edgeThreshold) {
      container.value.style.cursor = 'ns-resize';
      return;
  }

  container.value.style.cursor = 'default';
}

// 重置矩形悬停时的鼠标样式
function resetRectHoverCursor() {
  if (!container.value) return;
  if (!interactionMode.value) {
      container.value.style.cursor = 'default';
  }
}

// 交互流程控制
// 在交互状态部分新增移动阈值
const dragThreshold = computed(() => Math.min(rowHeight.value, colWidth.value) * 0.8);

// 修改 startInteraction 函数中的拖拽检测部分
function startInteraction(event: { ctrlKey: any; clientX: any; clientY: any; }) {
  if (!container.value) return;
  if (event.ctrlKey) return;
  
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  const rect = container.value.getBoundingClientRect();
  const rawX = mouseX - rect.left + container.value.scrollLeft;
  const rawY = mouseY - rect.top + container.value.scrollTop;

  clickStartPosition.value = { x: mouseX, y: mouseY };

   // 修改边缘检测逻辑（仅记录索引，不立即进入 resize 模式）
   for (let i = 0; i < rects.value.length; i++) {
    const r = rects.value[i];
    const rectX = r.column * colWidth.value;
    const rectTop = r.startRow * rowHeight.value;
    const rectBottom = rectTop + r.rowCount * rowHeight.value;

    if (rawX >= rectX && rawX <= rectX + colWidth.value) {
      if (Math.abs(rawY - rectTop) < 8) {
        activeRectIndex.value = i;
        resizeEdge.value = 'top';
        startRow.value = r.startRow;
        return; // 仅记录状态，等待移动判断
      }

      if (Math.abs(rawY - rectBottom) < 8) {
        activeRectIndex.value = i;
        resizeEdge.value = 'bottom';
        startRow.value = r.startRow;
        return; // 仅记录状态，等待移动判断
      }
    }
  }

  // 检测矩形拖拽
  for (let i = 0; i < rects.value.length; i++) {
    const r = rects.value[i];
    const rectX = r.column * colWidth.value;
    const rectY = r.startRow * rowHeight.value;
    if (
      rawX >= rectX &&
      rawX <= rectX + colWidth.value &&
      rawY >= rectY &&
      rawY <= rectY + r.rowCount * rowHeight.value
    ) {
      activeRectIndex.value = i;
      dragOffsetX.value = rawX - rectX;
      dragOffsetY.value = rawY - rectY;
      return; // 仅记录索引，等待后续移动判断
    }
  }


  // 开始新绘制
  interactionMode.value = 'draw';
  console.log('开始绘制');
  currentColumn.value = alignToColumn(mouseX);
  startRow.value = alignToGrid(mouseY);
  currentRow.value = startRow.value;
  container.value.style.cursor = 'crosshair';
  // 点击空白处取消选中
  selectedRectIndex.value = -1;
}

function checkOverlap(rectA: Rect, rectB: Rect) {
  if (rectA.column !== rectB.column) return false; // 不同列不重叠
  const aStart = rectA.startRow;
  const aEnd = rectA.startRow + rectA.rowCount - 1;
  const bStart = rectB.startRow;
  const bEnd = rectB.startRow + rectB.rowCount - 1;
  return aStart <= bEnd && bStart <= aEnd;
}

function handleMove(event: { clientX: number; clientY: number; }) {
  if (!container.value) return;
  const rect = container.value.getBoundingClientRect();
  const rawY = event.clientY - rect.top + container.value.scrollTop;

  if (activeRectIndex.value !== -1 && !interactionMode.value) {
    const moveDistance = Math.sqrt(
      Math.pow(event.clientX - clickStartPosition.value.x, 2) +
      Math.pow(event.clientY - clickStartPosition.value.y, 2)
    );

    if (moveDistance > dragThreshold.value) {
      interactionMode.value = 'drag';
      useScheduleStore.isShowEventForm = true;
      container.value.style.cursor = 'move';
    } else {
      return; // 未达阈值保持原状
    }
  }

    // 新增调整大小激活判断
  if (activeRectIndex.value !== -1 && resizeEdge.value && !interactionMode.value) {
    const moveDistance = Math.sqrt(
      Math.pow(event.clientX - clickStartPosition.value.x, 2) +
      Math.pow(event.clientY - clickStartPosition.value.y, 2)
    );

  if (moveDistance > dragThreshold.value) {
      interactionMode.value = 'resize';
      useScheduleStore.isShowEventForm = true;
      container.value.style.cursor = 'ns-resize';
    } else {
      return; // 未达阈值保持原状
    }
  }

  switch (interactionMode.value) {
      case 'draw': {
          useScheduleStore.isShowEventForm = true;
          const newCurrentRow = alignToGrid(event.clientY);
          const previewStartRow = Math.min(startRow.value, newCurrentRow);
          const previewRowCount = Math.abs(newCurrentRow - startRow.value);

          // 生成预览矩形
          const previewRect = {
              column: currentColumn.value,
              startRow: previewStartRow,
              rowCount: previewRowCount,
          };
          
          
          // 检查是否与现有矩形重叠
          const isOverlapping = rects.value.some(r => checkOverlap(previewRect, r));

          // 仅在无重叠时更新当前行
          if (!isOverlapping || previewRowCount === 0) {
              currentRow.value = newCurrentRow;
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(previewRect)};
          }
          break;
      }
      case 'drag': {
          const targetX = event.clientX - dragOffsetX.value;
          const targetY = rawY - dragOffsetY.value;

          const newColumn = alignToColumn(targetX + colWidth.value / 2);
          const newStartRow = Math.min(
              95 - rects.value[activeRectIndex.value].rowCount + 1,
              Math.max(0, Math.floor(targetY / rowHeight.value))
          );

          // 生成临时矩形
          const tempRect = {
              ...rects.value[activeRectIndex.value],
              column: newColumn,
              startRow: newStartRow
          };
          
          // 检测与其他矩形的冲突（排除自己）
          const isOverlapping = rects.value.some((r, index) =>
              index !== activeRectIndex.value && checkOverlap(tempRect, r)
          );

          if (!isOverlapping) {
              rects.value[activeRectIndex.value] = tempRect;
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(tempRect)};
          }
          break;
      }
      case 'resize': {
          const targetRect = rects.value[activeRectIndex.value];
          const currentGridRow = alignToGrid(event.clientY);
          let newStart = targetRect.startRow;
          let newRowCount = targetRect.rowCount;

          if (resizeEdge.value === 'top') {
              const maxRow = targetRect.startRow + targetRect.rowCount - 1;
              newStart = Math.min(maxRow, Math.max(0, currentGridRow));
              newRowCount = targetRect.rowCount + targetRect.startRow - newStart;
          } else {
              const minRow = targetRect.startRow;
              const maxRow = 95;
              const endRow = Math.min(maxRow, Math.max(minRow, currentGridRow));
              newRowCount = endRow - targetRect.startRow + 1;
          }

          // 边界处理
          if (newRowCount < 1) {
              newRowCount = 1;
              if (resizeEdge.value === 'top') {
                  newStart = targetRect.startRow + targetRect.rowCount - 1;
              }
          }

          // 生成临时矩形
          const tempRect = {
              ...targetRect,
              startRow: newStart,
              rowCount: newRowCount
          };

          // 检测与其他矩形的冲突（排除自己）
          const isOverlapping = rects.value.some((r, index) =>
              index !== activeRectIndex.value && checkOverlap(tempRect, r)
          );

          if (!isOverlapping) {
              rects.value[activeRectIndex.value] = tempRect;
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(tempRect)};
          }
          break;
      }
  }
}

function stopInteraction(event: {clientX: any; clientY: any}) {
  if (interactionMode.value === 'draw') {
    const moveDistance = Math.sqrt(
      Math.pow(event.clientX - clickStartPosition.value.x, 2) +
      Math.pow(event.clientY - clickStartPosition.value.y, 2)
    );

    if (moveDistance < 5 && !validHeight.value) {
      useScheduleStore.isShowEventForm = false;
      selectedRectIndex.value = -1;
    }
    else if (validHeight.value) {
      const newIndex = rects.value.push({
        column: currentColumn.value,
        startRow: Math.min(startRow.value, currentRow.value),
        rowCount: Math.abs(currentRow.value - startRow.value)
      }) - 1; // push返回新长度，减1得到索引

      // 给事件添加索引后存入
      const currentEvent = {
        ...useEventData.currentEvent,
        index: newIndex // 注入当前矩形索引
      };
     useEventData.currentWeekEvents.push(currentEvent);
    }
  } 
  // 新增拖拽和调整后的更新逻辑
  else if (interactionMode.value === 'drag' || interactionMode.value === 'resize') {
    const index = activeRectIndex.value;
    console.log(interactionMode.value);
    if (index !== -1) {
      // 使用新数据更新对应事件
      useEventData.currentWeekEvents.splice(index, 1, {
        ...useEventData.currentEvent,
        index: index // 保持索引不变
      });
    }
  }
  
  resetInteraction();
}

function cancelInteraction() {
  if (interactionMode.value === 'draw' && validHeight.value) {
      rects.value.push({
          column: currentColumn.value,
          startRow: Math.min(startRow.value, currentRow.value),
          rowCount: Math.abs(currentRow.value - startRow.value)
      });
  } else if (interactionMode.value === 'resize') {
      // 强制提交当前调整状态（已通过 handleMove 实时更新）
      rects.value = [...rects.value]; // 触发数组更新
  }

  resetInteraction();
}

function resetInteraction() {
  if (!container.value) return;
  interactionMode.value = null;
  activeRectIndex.value = -1;
  resizeEdge.value = null;
  container.value.style.cursor = 'default';
}

// 缩放处理
function handleWheel(event: { ctrlKey: any; preventDefault: () => void; deltaY: number; }) {
  if (event.ctrlKey) {
      event.preventDefault();
      if (interactionMode.value) return;

      const delta = Math.sign(event.deltaY) * -1;
      const newHeight = rowHeight.value + delta * 2;

      rowHeight.value = Math.min(
          maxRowHeight,
          Math.max(minRowHeight.value, newHeight)
      );
  }
}

// 选择矩形
function selectRect(index: number) {
  useEventData.currentEvent = useEventData.currentWeekEvents[index];
  selectedRectIndex.value = index;
}

// 处理按键事件
function handleKeyDown(event: { key: string; }) {
  if (event.key === 'Backspace' && selectedRectIndex.value!== -1) {
      const index = selectedRectIndex.value;
      // 同步删除
      rects.value = rects.value.filter((_, i) => i !== index);
      useEventData.currentWeekEvents = useEventData.currentWeekEvents.filter((_, i) => i !== index);
      
      // 重置后续元素的索引
      useEventData.currentWeekEvents = useEventData.currentWeekEvents.map((event, i) => ({
          ...event,
          index: i // 更新为新的数组索引
      }));
      
      selectedRectIndex.value = -1;
  }
}

//监听缩放，回传给时间轴
useCanvasParams.rowHeight = rowHeight.value*4;
useCanvasParams.colWidth = colWidth.value;

watch(rowHeight, (newHeight) => { useCanvasParams.rowHeight = newHeight*4 });
watch(colWidth, (newWidth) => { useCanvasParams.colWidth = newWidth });

// 清理事件监听
onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('scroll', handleScroll);
  }
  window.removeEventListener('keydown', handleKeyDown);
});

</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: overlay;
  background: white;
  display: flex;
}

.draw-canvas {
  width: 110%;
  background: #fff;
}

.grid-line.vertical {
  stroke-width: 1;
  stroke: #d9d9d9;
}

.grid-line.horizontal {
  stroke-width: 0.5;
  stroke: #eaeaea;
}

.preview-rect {
  fill: #cde6ff;

}

.final-rect {
  fill: #cde6ff;
  stroke-width: 1;
  transition: all 10ms linear;
  will-change: transform;
}
.rect-stripe {
  fill: #409EFF;
  stroke: none;
  rx: 8;
  ry: 8;

}
.final-rect.dragging {
  fill:#409EFF;
  filter: drop-shadow(0 3px 3px #2A598A);
}

.final-rect.selected {
  fill:#409EFF;
  stroke-width: 2;
  filter: drop-shadow(0 3px 3px #2A598A);
}
.hide-stripe {
  display: none;
}

.canvas-container[style*="cursor: ns-resize"] {
  cursor: ns-resize !important;
}
</style>