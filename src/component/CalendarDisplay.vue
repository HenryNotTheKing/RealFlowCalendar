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
              v-for="(rect, index) in useEventData.currentRects"
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
                  selected: useEventData.selectedIndex === index
              }"
              @mousemove="handleRectHover($event, index)"
              @mouseleave="resetRectHoverCursor"
              @mousedown="startInteraction($event)"
              @click="selectRect(index)"
              :style="assignColor(index)"
          />
          <foreignObject 
             v-for="(rect, index) in useEventData.currentRects"
            :key="'fo-'+index"
            :data-selected="useEventData.selectedIndex === index"
            :x="getRectPosition(rect).x + 8"
            :y="getRectPosition(rect).y"
            :width="getRectPosition(rect).width"
            :height="getRectPosition(rect).height"
            pointer-events="none"
            :style="assignColor(index)"
            >
            <div class="event-content" :class="{ selected: useEventData.selectedIndex === index }">
             <div class="event-title">{{ useEventData.currentWeekEvents[index]?.title }}</div>
              <div class="event-time">
                 {{ dayjs(useEventData.currentWeekEvents[index]?.start).format('HH:mm') }} 
               - {{ dayjs(useEventData.currentWeekEvents[index]?.end).format('HH:mm') }}
            </div>
              </div>
             </foreignObject>
          <path
              v-for="(rect, index) in useEventData.currentRects"
              :class="{ 'hide-stripe': interactionMode === 'drag' && activeRectIndex === index }"
              :key="'stripe-' + index"
              :d="getStripePath(rect)"
              class="rect-stripe"
              pointer-events="none"
              :style="assignColor(index)"

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
import { Rect } from '../types/schedule.js';
import dayjs from 'dayjs';
import { ElMessageBox } from 'element-plus';
import { ChatParams } from '../stores/ChatParams';

const useChatParams = ChatParams();

// 容器引用
const container = ref<HTMLElement|null>(null);

// 画布配置
const useCanvasParams = CanvasParams();
const useDateDisplay = DateDisplay();
const useScheduleStore = ScheduleStore();
const useEventData = EventData();

const canvasWidth = computed(() => useCanvasParams.canvasWidth );
const rowHeight = ref<number>(20);
const containerHeight = ref<number>(0);
const minRowHeight = computed(() => containerHeight.value / 96);
const canvasHeight = computed(() => Math.max(
  rowHeight.value * 96,  // 原有行高计算
  containerHeight.value  // 新增容器高度限制
));
const maxRowHeight = 50;
const colWidth = computed(() => canvasWidth.value / 7);


const assignColor = (index: number) => {
 return useEventData.colorMap[useScheduleStore.categories.find((item) => item.name === useEventData.currentWeekEvents[index].category)?.color || ''];

}


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
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);
const isCancelInteraction = ref(false);
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
  };
}


// 矩形悬停处理
function handleRectHover(event: { clientY: number; }, index: number) {
  if (interactionMode.value) return;
  if (!container.value) return;
  const rect = container.value.getBoundingClientRect();
  const mouseY = event.clientY - rect.top + container.value.scrollTop;
  const targetRect = useEventData.currentRects[index];

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
  useScheduleStore.isOperatingForm = false;
  isCancelInteraction.value = false;
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  const rect = container.value.getBoundingClientRect();
  const rawX = mouseX - rect.left + container.value.scrollLeft;
  const rawY = mouseY - rect.top + container.value.scrollTop;

  clickStartPosition.value = { x: mouseX, y: mouseY };

   // 修改边缘检测逻辑（仅记录索引，不立即进入 resize 模式）
   for (let i = 0; i < useEventData.currentRects.length; i++) {
    const r = useEventData.currentRects[i];
    const rectX = r.column * colWidth.value;
    const rectTop = r.startRow * rowHeight.value;
    const rectBottom = rectTop + r.rowCount * rowHeight.value;

    if (rawX >= rectX && rawX <= rectX + colWidth.value) {
      if (Math.abs(rawY - rectTop) < 8) {
        activeRectIndex.value = i;
        useEventData.selectedIndex = i
        useEventData.currentEvent = useEventData.currentWeekEvents[i];
        resizeEdge.value = 'top';
        startRow.value = r.startRow;
        return; // 仅记录状态，等待移动判断
      }

      if (Math.abs(rawY - rectBottom) < 8) {
        activeRectIndex.value = i;
        useEventData.selectedIndex = i;
        useEventData.currentEvent = useEventData.currentWeekEvents[i];
        resizeEdge.value = 'bottom';
        startRow.value = r.startRow;
        return; // 仅记录状态，等待移动判断
      }
    }
  }

  // 检测矩形拖拽
  for (let i = 0; i < useEventData.currentRects.length; i++) {
    const r = useEventData.currentRects[i];
    const rectX = r.column * colWidth.value;
    const rectY = r.startRow * rowHeight.value;
    if (
      rawX >= rectX &&
      rawX <= rectX + colWidth.value &&
      rawY >= rectY &&
      rawY <= rectY + r.rowCount * rowHeight.value
    ) {
      activeRectIndex.value = i;
      useEventData.selectedIndex = i;
      useEventData.currentEvent = useEventData.currentWeekEvents[i];
      dragOffsetX.value = rawX - rectX;
      dragOffsetY.value = rawY - rectY;
      return; // 仅记录索引，等待后续移动判断
    }
  }


  // 开始新绘制
  interactionMode.value = 'draw';
  useEventData.resetCurrentEvent();
  currentColumn.value = alignToColumn(mouseX);
  startRow.value = alignToGrid(mouseY);
  currentRow.value = startRow.value;
  container.value.style.cursor = 'crosshair';
  // 点击空白处取消选中
  useEventData.selectedIndex = -1;
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
    // 优先处理调整大小
    if (resizeEdge.value) {
        const moveDistance = Math.sqrt(
            Math.pow(event.clientX - clickStartPosition.value.x, 2) +
            Math.pow(event.clientY - clickStartPosition.value.y, 2)
        );
        
        if (moveDistance > dragThreshold.value) {
            interactionMode.value = 'resize';
            useScheduleStore.isShowEventForm = true;
            useChatParams.isChatBoxVisible = false;
            container.value.style.cursor = 'ns-resize';
            return; // 进入调整模式后直接返回
        }
    }
    // 处理拖拽
    else {
        const moveDistance = Math.sqrt(
            Math.pow(event.clientX - clickStartPosition.value.x, 2) +
            Math.pow(event.clientY - clickStartPosition.value.y, 2)
        );

        if (moveDistance > dragThreshold.value) {
            interactionMode.value = 'drag';
            useScheduleStore.isShowEventForm = true;
            useChatParams.isChatBoxVisible = false;
            container.value.style.cursor = 'move';
        }
    }
    
    if (!interactionMode.value) return; // 未触发任何模式时提前返回
}

  switch (interactionMode.value) {
      case 'draw': {
          useScheduleStore.isShowEventForm = true;
          useChatParams.isChatBoxVisible = false;
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
          const isOverlapping = useEventData.currentRects.some(r => checkOverlap(previewRect, r));

          // 仅在无重叠时更新当前行
          if (!isOverlapping || previewRowCount === 0) {
              currentRow.value = newCurrentRow;
              useEventData.resetRecurrence();
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(previewRect), repeat: false, title: '新事项',category: useScheduleStore.categories[0].name};
          }
          break;
      }
      case 'drag': {
          const targetX = event.clientX - dragOffsetX.value;
          const targetY = rawY - dragOffsetY.value;
          
          const newColumn = alignToColumn(targetX + colWidth.value / 2);
          const newStartRow = Math.min(
              95 - useEventData.currentRects[activeRectIndex.value].rowCount + 1,
              Math.max(0, Math.floor(targetY / rowHeight.value))
          );
          // 生成临时矩形
          const tempRect = {
              ...useEventData.currentRects[activeRectIndex.value],
              column: newColumn,
              startRow: newStartRow
          };

          // 检测与其他矩形的冲突（排除自己）
          const isOverlapping = useEventData.currentRects.some((r, index) =>
              index !== activeRectIndex.value && checkOverlap(tempRect, r)
          );

          if (!isOverlapping) {
              useEventData.currentRects[activeRectIndex.value] = tempRect;
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(tempRect)};
              useEventData.currentWeekEvents[activeRectIndex.value] = {
                  ...useEventData.currentWeekEvents[activeRectIndex.value],
                  ...getRectTimeRange(tempRect)
              };
          }
          break;
      }
      case 'resize': {
          const targetRect = useEventData.currentRects[activeRectIndex.value];
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
          const isOverlapping = useEventData.currentRects.some((r, index) =>
              index !== activeRectIndex.value && checkOverlap(tempRect, r)
          );

          if (!isOverlapping) {
              useEventData.currentRects[activeRectIndex.value] = tempRect;
              useEventData.currentEvent = {...useEventData.currentEvent, ...getRectTimeRange(tempRect)};
              useEventData.currentWeekEvents[activeRectIndex.value] = {
                  ...useEventData.currentWeekEvents[activeRectIndex.value],
                  ...getRectTimeRange(tempRect)
              };
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
      useEventData.selectedIndex = -1;
    }
    else if (validHeight.value) {
      useEventData.selectedIndex = useEventData.currentRects.push({
        column: currentColumn.value,
        startRow: Math.min(startRow.value, currentRow.value),
        rowCount: Math.abs(currentRow.value - startRow.value)
      }) - 1; // push返回新长度，减1得到索引

      // 给事件添加索引后存入
      const currentEvent = {
        ...useEventData.currentEvent,
        index: useEventData.selectedIndex,// 注入当前矩形索引
        id: crypto.randomUUID()
      };
      useEventData.currentEvent = currentEvent;
      useEventData.currentWeekEvents.push(currentEvent);
      useScheduleStore.addEvent(currentEvent);
    }
  }
  // 新增拖拽和调整后的更新逻辑
  else if (interactionMode.value === 'drag' || interactionMode.value === 'resize') {
    const index = activeRectIndex.value;
    if (index !== -1) {
      const originalEvent = { ...useEventData.currentWeekEvents[index]};
        useScheduleStore.updateEvent({
          ...originalEvent,
          start: useEventData.currentEvent.start,
          end: useEventData.currentEvent.end,
          id: originalEvent.id
        })
      
    }
  }

resetInteraction();
}


function cancelInteraction() {
  useScheduleStore.isOperatingForm = true;
  if (interactionMode.value === 'draw' && validHeight.value) {
      useEventData.selectedIndex = useEventData.currentRects.push({
          column: currentColumn.value,
          startRow: Math.min(startRow.value, currentRow.value),
          rowCount: Math.abs(currentRow.value - startRow.value)
      }) - 1;
      
      const currentEvent = {
        ...useEventData.currentEvent,
        index:useEventData.selectedIndex, // 注入当前矩形索引
        id: crypto.randomUUID()
      };
     useEventData.currentEvent = currentEvent;
     useEventData.currentWeekEvents.push(currentEvent);
  } else if (interactionMode.value === 'resize'|| interactionMode.value === 'drag') {
      // 强制提交当前调整状态（已通过 handleMove 实时更新）
      useEventData.currentRects = [...useEventData.currentRects]; // 触发数组更新
      useEventData.currentWeekEvents = [...useEventData.currentWeekEvents]; // 触发数组更新
  }
  isCancelInteraction.value = true;
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
  useScheduleStore.isShowEventForm = true;
  useChatParams.isChatBoxVisible = false;
  useEventData.currentEvent = useEventData.currentWeekEvents[index];
  useEventData.selectedIndex = index;
}

// 处理按键事件

function handleKeyDown(event: { key: string; }) {
  if (event.key === 'Backspace' && useEventData.selectedIndex !== -1 && !isCancelInteraction.value) {
    const targetIndex = useEventData.selectedIndex;
    if (targetIndex < 0 || targetIndex >= useEventData.currentWeekEvents.length) return;

    const deletedEvent = useEventData.currentWeekEvents[targetIndex];
    if (!deletedEvent?.id) return;

    if (deletedEvent.originalEventId) {
      ElMessageBox.confirm(
        '请选择删除方式：',
        '删除重复事件',
        {
          distinguishCancelAndClose: true,
          confirmButtonText: '删除所有重复',
          cancelButtonText: '仅删除此实例',
          type: 'warning'
        }
      ).then(() => {
        // 确认删除所有
        useScheduleStore.deleteEvent(deletedEvent, true);
        useEventData.selectedIndex = -1;
      }).catch((action: string) => {
        if (action === 'cancel') {
          // 确认删除单个实例
          useScheduleStore.deleteEvent(deletedEvent, false);
          useEventData.selectedIndex = -1;
        }
        // 直接关闭对话框不执行任何操作
      });
    } else {
      // 普通删除逻辑保持不变
      useScheduleStore.deleteEvent(deletedEvent, false);
      useEventData.selectedIndex = -1;
    }
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
  fill: var(--shallow);
  stroke-width: 1;
  will-change: transform;
}
.rect-stripe {
  fill: var(--deep);
  stroke: none;
  rx: 8;
  ry: 8;
}
.final-rect.dragging {
  fill:var(--deep);
  filter: drop-shadow(0 3px 3px var(--shadow));
}

.final-rect.selected {
  fill:var(--deep);
  stroke-width: 2;
  filter: drop-shadow(0 3px 3px var(--shadow));
}
.hide-stripe {
  display: none;
}

.canvas-container[style*="cursor: ns-resize"] {
  cursor: ns-resize !important;
}

.event-content {
  width: 93%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 4px;
  box-sizing: border-box;
  user-select: none;
  pointer-events: none;
  color:var(--text)
}

.event-title {
  font-size: 0.8em;
  font-weight: 500;
  line-height: 1.2;
  color: inherit; 
}

.event-time {
  font-size: 0.6em;
  opacity: 0.8;
  color: inherit; 
}
.event-content.selected .event-title,
.event-content.selected .event-time {
    color: white !important;
}
</style>