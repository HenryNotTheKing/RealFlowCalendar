<template>
  <div>
    <header class="navbar" style="-webkit-app-region: drag">
      <div class = "left-bar"></div>
      <div class = "center-panel"></div>
      <div class = "right-bar"></div>
    </header>
    <div class="container">
     <div class="left-panel">
      <div class="button-bar" @click="useChatParams.isChatBoxVisible=false">
        <router-link to = "/" class="btn-gray"><img src=".\assets\Icons\Calendar.svg" alt="calendar"></router-link>
        <router-link to = "/Gantt" class="btn-gray"><img src=".\assets\Icons\CheckSquare.svg" alt="calendar"></router-link>
        <router-link to = "/Todo" class="btn-gray"><img src=".\assets\Icons\Table.svg" alt="calendar"></router-link>
      </div>
     </div>
     <div class="center-panel"></div>
     <div class="right-panel"><ChatBox v-if="useChatParams.isChatBoxVisible" />
      <div class="chat-button">
          <img class="icon-send" 
            src=".\assets\Icons\send.svg" 
            alt="send" 
            @click="useChatParams.isChatBoxVisible ? useChatParams.sendMessage() : useChatParams.toggleChatBox()"
            :class="{ rotated: useChatParams.isChatBoxVisible }">
      </div>
    </div>
     <div class="sub-container"><router-view></router-view></div>
    </div>
  </div>

</template>

<script setup>
import ChatBox from './component/ChatBox.vue';
import { ChatParams } from './stores/ChatParams';
const useChatParams = ChatParams();
</script>

<style>
.chat-button {
  position: absolute;  
  width: 55px;         
  height: 55px;        
  background-color: #efefef; 
  border-radius: 50%;
  bottom: 40px;      
  right: 30px;       
  z-index: 999;        
  display: flex;       
  transition: all 0.2s ease-in-out;
}
.chat-button:hover {
  background-color: #d3d3d3;
  transition: all 0.2s ease-in-out;
}

.icon-send {
  rotate: -90deg;
  transform: translateX(-3px) translateY(3px);
  width: 30px;         
  height: 30px;       
  margin: auto;
  transition: transform 0.3s ease;        
}

.icon-send.rotated {
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}
img {
  user-select: none;
}

</style>
