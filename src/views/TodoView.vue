<template>
  <div class="sub-left-panel">
    <!-- 事件栏 -->
    <div class="event-bar">
      <div class="event-header">
        <h1 class="event-title">事项</h1>
      </div>
      <div class="event-container">
        <div
          v-for="(event, index) in events"
          :key="event.id"
          :class="['event-item', { 
            'selected': currentEvent.id === event.id,
            'new-item': event.id === newestEventId,
            'hovered': hoverIndex === index
          }]"
          @click="setCurrentEvent(event)"
          @mouseenter="hoverIndex = index"
          @mouseleave="hoverIndex = -1"
        >
          <template v-if="editingEventId === event.id">
            <input
              v-model="eventTitleInput"
              class="text-display"
              type="text"
              :id="`event-title-input-${event.id}`" 
              autofocus
              @blur="saveEventTitle(event)"
              @keyup.enter="$event.target.blur()"
              @click.stop
            />
          </template>
          <template v-else>
            <span
              class="event-title-text"
              @dblclick.stop="startEditingEventTitle(event)"
            >
              {{ event.title }}
            </span>
          </template>
          <div 
            class="delete-icon" 
            v-show="hoverIndex === index"
            @click.stop="deleteEvent(index)"
          >
            <img src="../assets/Icons/delete.svg" alt="DELETE" />
          </div>
        </div>
        <!-- 添加事项按钮 -->
        <div class="add-event-btn" @click="addEvent()">
          <img src="../assets/Icons/Plus.svg" alt="ADD" />
        </div>
      </div>
    </div>
  </div>
  <div class="sub-center-panel">
    <!-- Todolist 标题 -->
    <div class="todolist-title">
      <h1>ToDoList</h1>
    </div>
    <!-- 任务栏 -->
    <header class="task-box-header">
      <h1 class="task-box-title">{{ currentEvent.title }}的所有任务</h1>
    </header>
    <div class="task-box-body">
      <div
        v-for="tag in ['待办', '进行中', '已完成']"
        :key="tag"
        :class="['column', { 'drag-over': dragOverColumn === tag }]"
        @dragover.prevent="handleDragOver(tag)"
        @dragenter.prevent="handleDragEnter(tag)"
        @dragleave="handleDragLeave(tag)"
        @drop="onDrop($event, tag)"
      >
        <h2 style="user-select: none">{{ tag }}</h2>
        <button class="add-task-button" @click="openAddTaskModal(tag)">+</button>
        <div class="task-container">
          <div
            v-for="(task, index) in sortedTasks(currentEvent[tag])"
            :key="task.id"
            class="task"
            draggable="true"
            @dragstart="onDragStart($event, task, tag, index)"
          >
            <div class="task-content" @click="openUpdateTaskModal(task)">
              <h2 :class="['task-name over-hide', getPriorityClass(task.priority)]">{{ task.name }}</h2>
              <p class="task-details">{{ task.details }}</p>
              <p class="task-deadline">截止日期: {{ formatDate(task.deadline) }}</p>
            </div>
            <div class="remove-bar" @click.stop="handleRemoveTask(task.id)">-</div>
          </div>
        </div>
      </div>
    </div>
  </div>
    <!-- 添加任务模态框 -->
    <div v-show="showAddTaskModal" class="modal-overlay">
      <div class="modal">
        <h2>添加新任务</h2>
        <input v-model="newTaskName" placeholder="任务名称" /> 
        <input v-model="newTaskDetails" placeholder="详情" />  
        <input type="date" v-model="newTaskDeadline" placeholder="截止日期" />
        <input type="number" v-model="newTaskPriority" placeholder="优先级 (1-3)" min="1" max="3" />
        <div class="modal-actions">
          <button @click="handleAddTask">添加</button>
          <button @click="showAddTaskModal = false">取消</button>
        </div>
      </div>
    </div>
    <!-- 更新任务模态框 -->
    <div v-show="showUpdateTaskModal" class="modal-overlay">
      <div class="modal">
        <h2>编辑任务</h2>
        <input v-model="updatedTaskName" placeholder="输入任务名称" />
        <input v-model="updatedTaskDetails" placeholder="输入任务详情" />
        <div class="modal-actions">
          <button @click="handleUpdateTask">保存</button>
          <button @click="showUpdateTaskModal = false">取消</button>
        </div>
      </div>
    </div>
    <div class="sub-right-panel" v-if="useChatParams.isChatBoxVisible"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from "vue";
import { ChatParams } from "../stores/ChatParams";

const useChatParams = ChatParams();
const hoverIndex = ref(-1);
const newestEventId = ref(null); // 跟踪最新添加的事项ID
const editingEventId = ref(null); // 当前正在编辑的事项 ID
const eventTitleInput = ref(""); // 输入框中的值
const showAddTaskModal = ref(false);
const showUpdateTaskModal = ref(false);


// 生成唯一ID
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// 初始化默认任务
function createDefaultTask(title, details = "", status = "待办", deadline = new Date(), priority = 2) {
  return {
    id: generateId(),
    name: title,
    details: details,
    deadline: deadline,
    completed: status === "已完成",
    priority: priority,
    status: status,
  };
}

// 初始化默认事件
function createDefaultEvent(title = "新事项") {
  return {
    id: generateId(),
    title: title,
    待办: [],
    进行中: [],
    已完成: [],
  };
}

// 状态管理
const events = ref(JSON.parse(localStorage.getItem("events")) || [createDefaultEvent()]);
const currentEvent = ref(events.value[0]);
const dragOverColumn = ref(null);

const newTaskName = ref("");
const newTaskDetails = ref("");
const newTaskDeadline = ref("");
const updatedTaskName = ref("");
const newTaskPriority = ref(2);
const updatedTaskDetails = ref("");


const currentTag = ref("");
const currentTaskId = ref("");

// 拖拽相关状态
let leaveTimer = null;
const draggedTask = ref(null);
const sourceTag = ref(null);
const sourceIndex = ref(null);
// 日期格式化函数
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPriorityClass(priority) {
  switch (priority) {
    case 1: return 'priority-1';
    case 2: return 'priority-2';
    case 3: return 'priority-3';
    default: return 'priority-2';
  }
}

const sortedTasks = computed(() => {
  return (tasks) => {
    if (!Array.isArray(tasks)) return [];
    return [...tasks].sort((a, b) => b.priority - a.priority);
  };
});
// 添加事件
const addEvent = () => {
  // 清除之前的新事项标记
  if (newestEventId.value) {
    const prevNewIndex = events.value.findIndex(e => e.id === newestEventId.value);
    if (prevNewIndex !== -1) {
      events.value[prevNewIndex].isNew = false;
    }
  }

  const newEvent = createDefaultEvent();
  events.value.push(newEvent);
  currentEvent.value = newEvent;
  newestEventId.value = newEvent.id;

  nextTick(() => {
    const inputs = document.querySelectorAll('.text-display');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  });
};
// 处理输入框失去焦点
const handleBlur = (index) => {
  if (!events.value[index].title.trim()) {
    events.value[index].title = "新事项";
  }
  // 移除新事项标记
  events.value[index].isNew = false;
  updateEvent(index, { title: events.value[index].title });
};

const updateEvent = (index, payload) => {
  events.value[index] = { ...events.value[index], ...payload };
};

const deleteEvent = (index) => {
  if (confirm("确定要删除该事项吗？")) {
    // 如果删除的是当前最新事项，清除标记
    if (events.value[index].id === newestEventId.value) {
      newestEventId.value = null;
    }
    events.value.splice(index, 1);
    if (events.value.length > 0) {
      currentEvent.value = events.value[events.value.length - 1];
    } else {
      const newEvent = createDefaultEvent();
      events.value.push(newEvent);
      currentEvent.value = newEvent;
    }
  }
};

const setCurrentEvent = (event) => {
  currentEvent.value = event;
  newestEventId.value = null;
};

// 任务操作方法
const openAddTaskModal = (tag) => {
  currentTag.value = tag;
  showAddTaskModal.value = true;
};

const handleAddTask = () => {
  if (!newTaskName.value.trim()) {
    alert("任务名称不能为空");
    return;
  }

  const newTask = createDefaultTask(
    newTaskName.value.trim(),
    newTaskDetails.value.trim(),
    currentTag.value,
    new Date(newTaskDeadline.value),
    newTaskPriority.value
  );

  currentEvent.value[currentTag.value].push(newTask);
  newTaskName.value = "";
  newTaskDetails.value = "";
  newTaskDeadline.value = "";
  newTaskPriority.value = 2;
  showAddTaskModal.value = false;
};

const openUpdateTaskModal = (task) => {
  currentTaskId.value = task.id;
  updatedTaskName.value = task.name;
  updatedTaskDetails.value = task.details;
  showUpdateTaskModal.value = true;
};

const handleUpdateTask = () => {
  let updated = false;

  ["待办", "进行中", "已完成"].forEach((tag) => {
    const taskIndex = currentEvent.value[tag].findIndex((task) => task.id === currentTaskId.value);
    if (taskIndex !== -1) {
      currentEvent.value[tag][taskIndex] = {
        ...currentEvent.value[tag][taskIndex],
        name: updatedTaskName.value,
        details: updatedTaskDetails.value,
      };
      updated = true;
    }
  });

  if (!updated) {
    console.warn("未找到要更新的任务");
  }

  showUpdateTaskModal.value = false;
};

const handleRemoveTask = (id) => {
  ["待办", "进行中", "已完成"].forEach((tag) => {
    const taskIndex = currentEvent.value[tag].findIndex((task) => task.id === id);
    if (taskIndex !== -1) {
      currentEvent.value[tag].splice(taskIndex, 1);
    }
  });
};

// 拖拽方法
const handleDragOver = (tag) => {
  if (tag !== sourceTag.value) {
    dragOverColumn.value = tag;
  }
};

const handleDragEnter = (tag) => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  if (tag !== sourceTag.value) {
    dragOverColumn.value = tag;
  }
};

const handleDragLeave = (tag) => {
  if (dragOverColumn.value === tag) {
    leaveTimer = setTimeout(() => {
      dragOverColumn.value = null;
    }, 100);
  }
};

const onDragStart = (event, task, tag, index) => {
  draggedTask.value = { ...task }; // 克隆
  sourceTag.value = tag;
  sourceIndex.value = index;
  event.dataTransfer.setData("text/plain", task.id);

  //拖拽预览
  const dragImage = event.target.cloneNode(true);
  dragImage.style.width = `${event.target.offsetWidth}px`;
  dragImage.style.position = "absolute";
  dragImage.style.top = "-1000px";
  document.body.appendChild(dragImage);
  event.dataTransfer.setDragImage(dragImage, 0, 0);
  setTimeout(() => document.body.removeChild(dragImage), 0);
};

const onDrop = (event, targetTag) => {
  if (draggedTask.value && sourceTag.value !== null && sourceIndex.value !== null) {

    // 从源列中移除任务
    currentEvent.value[sourceTag.value].splice(sourceIndex.value, 1);

    // 检查目标列是否已经包含相同的任务
    const isDuplicate = currentEvent.value[targetTag].some(
      (task) => task.id === draggedTask.value.id
    );
    if (!isDuplicate) {
      currentEvent.value[targetTag].push({ ...draggedTask.value });
    }

    // 手动触发排序
    currentEvent.value[targetTag] = [...currentEvent.value[targetTag]].sort((a, b) => b.priority - a.priority);

    // 清理拖拽状态
    dragOverColumn.value = null;
    draggedTask.value = null;
    sourceTag.value = null;
    sourceIndex.value = null;
  }
};

// 数据持久化
const saveToLocalStorage = () => {
  try {
    localStorage.setItem("events", JSON.stringify(events.value));
  } catch (e) {
    console.error("保存数据失败:", e);
  }
};

// 监听数据变化
watch(events, saveToLocalStorage, { deep: true });

// 初始化数据
onMounted(() => {
  const savedEvents = JSON.parse(localStorage.getItem("events"));
  if (savedEvents) {
    savedEvents.forEach((event) => {
      ["待办", "进行中", "已完成"].forEach((status) => {
        event[status].forEach((task) => {
          task.deadline = new Date(task.deadline);
        });
      });
    });
    events.value = savedEvents;
    currentEvent.value = events.value[0];
  }
});
function startEditingEventTitle(event) {
  editingEventId.value = event.id;
  eventTitleInput.value = event.title;
  nextTick(() => {
    const input = document.querySelector(`event-title-input-${event.id}`);
    if (input) {
      input.focus();
    }
  });
}

function saveEventTitle(event) {
  if (eventTitleInput.value.trim()) {
    event.title = eventTitleInput.value.trim();
  } else {
    event.title = "新事项"; // 默认名
  }
  editingEventId.value = null; // 结束编辑
  newestEventId.value = null;
  handleBlur(events.value.findIndex(e => e.id === event.id)); // 触发保存到 localStorage
}

</script>

<style scoped>
.sub-left-panel,
.sub-center-panel,
.sub-right-panel {
  height: 100vh;
  overflow-y: auto;
}

.event-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px;
}

.event-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.event-title {
  font-size: 1.5em;
  font-weight: bold;
}

.add-event {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
}

.add-event:hover {
  background-color: #efefef;
}

.text-add {
  font-size: 14px;
  color: #868686;
  margin-left: 8px;
}

.event-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 8px;
  background-color: #f7f7f7;
  cursor: pointer;
  transition: all 0.1s ease;
}
.event-item:hover {
  background-color: #e0e0e0;
}
.event-item.new-item {
  background-color: #e0f0ff;
  box-shadow: 0 2px 8px rgba(0, 120, 255, 0.15);
  border-left: 3px solid red;
}

.event-item.selected {
  background-color: #e0e0e0;
}
.event-title-text {
  font-size: 20px;
  color: #868686;
  margin-left: 8px;
  user-select: none;
  width: 90%;
  height: 28px;
  text-align: center;
  line-height: 28px; /* 垂直居中 */
  padding: 0;
  background-color: transparent;
  border: none;
  outline: none;
  cursor: pointer;
}

.text-display {
  font-size: 20px;
    color: #868686;
    margin-left: 8px;
    user-select: none;
    width: 90%;
    height: 28px;
    border-radius: 4px;
    text-align: center;
    padding: 0 8px;
    border: none;
    outline: none;
    background: none;
    box-shadow: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
}

.text-display:focus {
  background-color: #efefef;
}

.delete-icon {
  width: 20px;
  height: 20px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-icon:hover {
  opacity: 1;
}

.add-event-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.add-event-btn:hover {
  background-color: #e8e8e8;
}

.add-event-btn img {
  width: 20px;
  height: 20px;
  opacity: 0.7;
}

.add-event-btn:hover img {
  opacity: 1;
}

.todolist-title {
  font-size: 15px;
  font-weight: 600;
  margin-left: 3%;
  user-select: none;
  margin-right: 5px;
  border-right: 5px;
  align-self: flex-end;
}

.task-box {
  flex: 1;
  min-width: 1070px;
  background-color: #fefefe;
}

.task-box-header {
  display: flex;
  align-items: center;
  padding: 0 50px;
  padding-top: 22px;
  -webkit-app-region: drag;
}

.task-box-title {
  font-size: 2.5em;
  padding: 25px 0;
  user-select: none;
  font-weight: 500;
}

.task-box-body {
  display: flex;
  justify-content: space-evenly;
  gap: 20px;
  align-items: flex-start;
  width: 100%;
  height: 700px;
  margin-top: 20px;
  padding: 0 15px;
}

.column {
  width: 300px;
  max-height: 700px;
  background-color:#f7f7f7 ;
  text-align: center;
  border-radius: 15px;
  padding: 17px 25px;
  font-size: 1.2em;
  font-weight: bold;
  transition: all 0.3s ease;
  -webkit-app-region: no-drag;
}

.column.drag-over {
  transform: scaleY(1.05);
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  background-color: #f5f5f5;
}

.column.drag-over .task-container {
  min-height: 650px;
}

.add-task-button {
  width: 200px;
  height: 40px;
  font-size: 1.1em;
  line-height: 40px;
  border: none;
  background-color: #ccc;
  border-radius: 10px;
  margin: 15px 0;
  cursor: pointer;
  transition: 0.1s;
  outline: none;
  text-align: center;
  font-style: normal;
  user-select: none;
}

.add-task-button:hover {
  background-color: #dedede;
}

.task-container {
  width: 100%;
  min-height: 30px;
  max-height: 600px;
  overflow: auto;
}

.task {
  text-align: left;
  position: relative;
  width: 100%;
  background-color: #fff;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 18px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
  border: 1px solid #ccc;
  outline: none;
  -webkit-app-region: no-drag;
}

.task:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task:active {
  transform: translateY(0);
}
.task:hover .remove-bar {
  opacity: 1; 
  visibility: visible; 
}
.task-name {
  font-style: normal;
  font-size: 0.9em;
  font-weight: 300;
  line-height: 1.1em;
  user-select: none;
}

.task-name::before {
  content: "●";
  font-style: normal;
  margin-right: 10px;
}

.priority-1::before {
  color: green;
}
.priority-2::before {
  color: orange;
}
.priority-3::before {
  color: red;
}


.task-details {
  font-style: normal;
  font-weight: 300;
  font-size: 0.8em;
  color: #9c9c9c;
  word-wrap: break-word;
  margin-top: 10px;
  line-height: 1.1em;
}
.task-deadline {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 0.5em;
  color: #9c9c9c;
  font-style: italic;
}
.remove-bar {
  position: absolute;
  top: 10px;
  right: 10px;
  text-align: end;
  font-size: 1.5em;
  font-weight: 300;
  color: #888;
  line-height: 0.1em;
  transition: 0.2s;
  z-index: 1;
  cursor: pointer;
  opacity: 0; 
  visibility: hidden; 
}
.remove-bar:hover {
  line-height: 0.01em;
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-overlay[style*="display: flex"] {
  opacity: 1;
}
.modal {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-20px);
  transition: transform 0.3s ease;
  position: fixed;
  z-index: 1000;
}
.modal-overlay[style*="display: flex"] .modal {
  transform: translateY(0);
}
.modal h2 {
  margin-bottom: 15px;
  font-size: 1.2em;
}
.modal input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  -webkit-app-region: no-drag;
}
.modal-actions {
  display: flex;
  justify-content: space-between;
}
.modal-actions button {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: 0.3s;
  -webkit-app-region: no-drag;
}
.modal-actions button:first-child {
  background-color: red;
  color: #fff;
}
.modal-actions button:first-child:hover {
  background-color: #0056b3;
}
.modal-actions button:last-child {
  background-color: #ccc;
}
</style>