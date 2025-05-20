import { defineStore } from "pinia";
import { ref } from "vue";
import axios from 'axios';
import { ScheduleStore } from "./ScheduleStore";
import { getWeekKey } from '../utils/dataHelper';
import { io, Socket } from "socket.io-client";
export const ChatParams = defineStore("ChatParams", () => {
    // 共享状态
    const pendingImageCount = ref(0);
    const currentSessionId = ref<string>();
    const useScheduleStore = ScheduleStore();
    const isChatBoxVisible = ref(false);
    const messages = ref<Message[]>([]);
    const inputMessage = ref("");

    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const socket = ref<Socket | null>(null);
    const isConnected = ref(false);

    // 初始化 WebSocket
    const initSocket = () => {
        socket.value = io("ws://localhost:5000", {
            reconnection: true,
            reconnectionAttempts: 3
        });

        // 事件监听
        socket.value.on("connect", () => {
            isConnected.value = true;
            currentSessionId.value = socket.value?.id; 
        });

        socket.value.on("disconnect", () => {
            isConnected.value = false;
        });

        socket.value.on("message", (data: { content: string }) => {
            messages.value.push({
                content: data.content,
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
            });
        });

        socket.value.on("event_created", (data: { event: any }) => {
            useScheduleStore.addEventFromAi(data.event);
        });

        socket.value.on("error", (err: { message: string }) => {
            error.value = `连接错误: ${err.message}`;
        });
    };

    const toggleChatBox = () => {
        isChatBoxVisible.value = !isChatBoxVisible.value;
        useScheduleStore.isShowEventForm = false;
        if (isChatBoxVisible.value) {
            messages.value = [];

            messages.value.push({
                content: '您好！我是您的日程助手，有什么可以帮您？',
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
            });
        } else {
            socket.value?.disconnect();
            messages.value = [];
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.value.trim()) return;

        // 添加用户消息
        messages.value.push({
            content: inputMessage.value,
            sender: 'user',
            timestamp: new Date(),
            type: 'text'
        });

        try {
            isLoading.value = true;

            if (pendingImageCount.value > 0) {
                // 构造带上下文的特殊消息
                const contextMessage = {
                    type: 'img_context',
                    message: inputMessage.value,
                    count: pendingImageCount.value, // 携带当前计数
                    session_id: currentSessionId.value
                };

                // 发送组合消息
                socket.value?.emit('message', contextMessage);
                messages.value.push({
                    content: "收到！",
                    sender: 'ai',
                    timestamp: new Date(),
                    type: 'text'
                });
                console.log('发送组合消息:', contextMessage);
            } else {
                initSocket();
                socket.value?.emit('message', {
                    type: 'text',
                    message: inputMessage.value,
                    session_id: currentSessionId.value
                })
                console.log('发送文本消息:', inputMessage.value);
            };
        } catch (err) {
            error.value = '消息发送失败';
        } finally {
            isLoading.value = false;
            inputMessage.value = "";
        }
    };


    const addImageMessage = (base64: string) => {
        // 添加加载提示
        messages.value.push({
            content: '正在分析图片...',
            sender: 'ai',
            timestamp: new Date(),
            type: 'text'
        });

        try {

            initSocket();
            // 通过 WebSocket 发送图片
            socket.value?.emit('message', {
                type: 'img',
                imageBase64: base64,  // 字段名与后端一致
                session_id: currentSessionId.value
            });

            pendingImageCount.value++; // 增加计数
        } catch (err) {
            error.value = '图片发送失败';
            console.error('Image Send Error:', err);
        }
    };

    socket.value?.on("image_processed", () => {
        if (pendingImageCount.value > 0) {
            pendingImageCount.value--;
        }
    })

    return {
        pendingImageCount,
        isChatBoxVisible,
        messages,
        inputMessage,
        isLoading,
        error,
        addImageMessage,
        toggleChatBox,
        sendMessage,
        isConnected
    };
});

interface Message {
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    type: 'text' | 'image';
}