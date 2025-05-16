import { defineStore } from "pinia";
import { ref } from "vue";
import axios from 'axios';
import { ScheduleStore } from "./ScheduleStore";

export const ChatParams = defineStore("ChatParams", () => {
    // 共享状态
    const api = axios.create({
        baseURL: 'http://localhost:5000',
        timeout: 30000
    })

    const useScheduleStore = ScheduleStore();
    const isChatBoxVisible = ref(false);
    const messages = ref<Message[]>([]);
    const inputMessage = ref("");

    const isLoading = ref(false);
    const error = ref<string | null>(null);
    // 共享方法
    const toggleChatBox = () => {
        isChatBoxVisible.value = !isChatBoxVisible.value;
        useScheduleStore.isShowEventForm = false;
        if (isChatBoxVisible.value) {
            messages.value = [];
            // 添加AI问候语
            messages.value.push({
                content: '您好！我是您的日程助手，有什么可以帮您？',
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
            });
        } else {
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
            const aiResponse = await getAIResponse(inputMessage.value);

            messages.value.push({
                content: aiResponse,
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
            });
        } catch (err) {
            error.value = '请求失败，请检查网络连接';
            console.error('API Error:', err);
        } finally {
            isLoading.value = false;
            inputMessage.value = "";
        }
    };

    // 修改后的AI交互方法
    const getAIResponse = async (message: string) => {
        const response = await api.post('/chat', {
            type: 'text',  // 明确指定类型
            message: message  // 保持字段名称与后端一致
        });
        return response.data.reply;
    };

    const addImageMessage = (base64: string) => {
        messages.value.push({
            content: '正在分析图片...',
            sender: 'ai',
            timestamp: new Date(),
            type: 'text'
        });

        // 新增图片请求逻辑
        api.post('/chat', {
            type: 'img',
            imageBase64: base64  // 字段名与后端一致
        }).then(response => {
            messages.value.push({
                content: response.data.reply,
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
            });
        }).catch(err => {
            error.value = '图片分析失败';
            console.error('Image API Error:', err);
        });
    };
    return {
        isChatBoxVisible,
        messages,
        inputMessage,
        isLoading,
        error,
        addImageMessage,
        toggleChatBox,
        sendMessage
    };
});

interface Message {
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    type: 'text' | 'image';
}