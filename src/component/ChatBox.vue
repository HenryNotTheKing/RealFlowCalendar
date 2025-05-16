<template>
  <div class="chat-box">
    <div class="dialog-box"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    :class="{ 'drag-over': dragOver }">
      <transition-group 
        name="message-fade"
        appear
      >
        <div 
          v-for="(msg, index) in useChatParams.messages" 
          :key="index + msg.timestamp.getTime()"
          :class="['message', msg.sender]"
        >
          <div class="bubble">{{ msg.content }}</div>
          <div class="timestamp">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </transition-group>
    </div>
    <transition name="input-slide" appear>
      <el-input 
        v-model="useChatParams.inputMessage" 
        @keyup.enter.native="useChatParams.sendMessage" 
        @paste.native="handlePaste"
        placeholder="请输入..."
        class="text-input"
        v-if="useChatParams.isChatBoxVisible"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ChatParams } from '../stores/ChatParams';
import { ref } from 'vue';
const useChatParams = ChatParams();

const handlePaste = async (event: ClipboardEvent) => {
  const clipboardItems = event.clipboardData?.items;
  if (!clipboardItems) return;

  for (const item of clipboardItems) {
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        const base64 = await convertToBase64(file);
        useChatParams.addImageMessage(base64);
      }
      return;
    }
  }
};

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const dragOver = ref(false);

const onDragOver = (e: DragEvent) => {
  dragOver.value = true;
};

const onDragLeave = () => {
  dragOver.value = false;
};

const onDrop = async (e: DragEvent) => {
  dragOver.value = false;
  const dt = e.dataTransfer;
  if (dt?.items) {
    for (const item of dt.items) {
      if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const base64 = await convertToBase64(file);
          useChatParams.addImageMessage(base64);
        }
      }
    }
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
</script>

<style scoped>
.message-fade-enter-active,.message-fade-appear-active {
  transition: all 0.3s ease-out;
}

.message-fade-enter-from,.message-fade-appear-from {
  opacity: 0;
  transform: translateY(20px);
}

.message.user .bubble {
  transition: transform 0.2s ease;
}

.message.user .bubble:hover {
  transform: translateX(-5px);
}

/* AI消息特殊动画 */
.message.ai .bubble {
  transition: transform 0.2s ease;
}

.message.ai .bubble:hover {
    transform: translateX(5px);
}

.input-slide-enter-active {
  transition: all 0.2s 
}


.input-slide-enter-from,
.input-slide-leave-to {
  transform: translateX(120px);
  opacity: 0;
}

.text-input {
    /* 保持原有定位 */
    position: absolute;
    right: 90px;
    bottom: 80px;
    /* 新增初始位置 */
    width: 200px;
}

.chat-box {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  z-index: 800;        
  position: relative;
}

.dialog-box {
  height: 85%;
  padding: 16px;
  overflow-y: auto;
  transition: background-color 0.3s ease;
}
.dialog-box.drag-over {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}
.message {
  margin: 12px 0;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.ai {
  align-items: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 12px;
  border-radius: 12px;
  margin: 4px 0;
}

.user .bubble {
  background: #409eff;
  color: white;
}

.ai .bubble {
  background: #ffffff;
  border: 1px solid #ddd;
}

.timestamp {
  font-size: 12px;
  color: #666;
}

.text-input {
  width: 200px;
  position: absolute;
  right: 90px;
  bottom: 80px;
  overflow-y: auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

</style>