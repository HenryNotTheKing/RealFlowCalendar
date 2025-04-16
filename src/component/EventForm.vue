<template>
    <div class="event-form">
        <el-form :model="useEventData.currentEvent" label-width="auto" style="max-width: 300px">
            <el-form-item label="类别" label-position="top">
                <el-select v-model="useEventData.currentEvent.category" placeholder="请选择" class="custom-select">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"
                        class="custom-option" />
                </el-select>
            </el-form-item>
            <el-form-item label="标题" label-position="top">
                <el-input v-model="useEventData.currentEvent.title" />
            </el-form-item>
            <el-form-item label="时间">
                <el-col :span="8">
                    <el-time-picker v-model="useEventData.currentEvent.start" format="HH:mm" :show-seconds="false" placeholder="开始"
                        style="width: 100%; font-size: 13px" :clearable="false" />
                </el-col>
                <el-col :span="2" class="text-center">
                    <div style="display: flex; justify-content: center; color: #3d3d3d">-</div>
                </el-col>
                <el-col :span="8">
                    <el-time-picker v-model="useEventData.currentEvent.end" format="HH:mm" :show-seconds="false" placeholder="结束"
                        style="width: 100%; font-size: 13px" :clearable="false"/>
                </el-col>
                <el-col :span="24">
                    <el-form-item style="margin-left: 0">
                        <el-text type="info">
                            {{ durationText }}
                        </el-text>
                    </el-form-item>
                </el-col>
                <el-col :span="24">
                    <el-form-item style="margin-left: 0">
                        <el-text type="info" v-if="useEventData.currentEvent.start">
                            {{ dayjs(useEventData.currentEvent.start).format('YYYY年MM月DD日') }}
                        </el-text>
                    </el-form-item>
                </el-col>
            </el-form-item>
            <el-form-item>
                <el-col :span="10">
                    <el-form-item label="全天">
                        <el-switch v-model="useEventData.currentEvent.allDay" @change="deleteEvent" />
                    </el-form-item>
                </el-col>
                <el-col :span="8">
                    <el-form-item label="重复">
                        <el-switch v-model="useEventData.currentEvent.repeat" @change="handleRepeatSwitch" :disabled="showRepeatDialog" />
                    </el-form-item>
                </el-col>
            </el-form-item>
            <el-form-item label="地点">
                <el-input v-model="useEventData.currentEvent.location" />
            </el-form-item>
            <el-form-item label="描述">
                <el-input v-model="useEventData.currentEvent.description" type="textarea" />
            </el-form-item>
        </el-form>
        <el-dialog v-model="showRepeatDialog" title="设置重复规则" width="600px" destroy-on-close :append-to-body="true"
            :modal-append-to-body="true">
            <el-form :model="useEventData.currentEvent.recurrence" label-width="100px">
                <!-- 重复类型 -->
                <el-form-item label="重复类型">
                    <el-select v-model="useEventData.currentEvent.recurrence.type">
                        <el-option v-for="item in repeatTypes" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>

                <!-- 间隔周期 -->
                <el-form-item label="每间隔">
                    <el-input-number v-model="useEventData.currentEvent.recurrence.interval" :min="1" :max="365" />
                    <span class="ml-2">{{ intervalUnit }}</span>
                </el-form-item>

                <!-- 周重复时的星期选择 -->
                <el-form-item v-if="useEventData.currentEvent.recurrence.type === 'weekly'" label="重复星期">
                    <el-checkbox-group v-model="useEventData.currentEvent.recurrence.daysOfWeek">
                        <el-checkbox v-for="(day, index) in weekDays" :key="index" :label="index">
                            {{ day }}
                        </el-checkbox>
                    </el-checkbox-group>
                </el-form-item>

                <!-- 结束条件 -->
                <el-form-item label="结束条件">
                    <el-radio-group v-model="useEventData.currentEvent.recurrence.endCondition">
                        <el-radio label="never">永不</el-radio>
                        <el-radio label="occurrences">重复次数</el-radio>
                        <el-radio label="untilDate">结束日期</el-radio>
                    </el-radio-group>
                </el-form-item>

                <!-- 次数输入 -->
                <el-form-item v-if="useEventData.currentEvent.recurrence.endCondition === 'occurrences'" label="重复次数">
                    <el-input-number v-model="useEventData.currentEvent.recurrence.occurrences" :min="1" :max="999" />
                </el-form-item>

                <!-- 结束日期 -->
                <el-form-item v-if="useEventData.currentEvent.recurrence.endCondition === 'untilDate'" label="结束日期">
                    <el-date-picker v-model="useEventData.currentEvent.recurrence.endDate" type="date" value-format="YYYY-MM-DD"
                        placeholder="选择结束日期" />
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="showRepeatDialog = false">取消</el-button>
                <el-button type="primary" @click="confirmRepeat">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import { ScheduleStore } from '../stores/ScheduleStore'
import { EventData } from '../stores/EventData';
import { getRectPositionFromTimeRange } from '../utils/dataHelper';



const useEventData = EventData();
const useScheduleStore = ScheduleStore();
const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
]

import type { ScheduleEvent, RecurrenceRule } from '../types/schedule';

// 修复 1: 明确表单类型

const showRepeatDialog = ref(false)

// 可用选项
const repeatTypes = [
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'yearly', label: '每年' }
]

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 计算间隔单位
const intervalUnit = computed(() => {
    const map = {
        daily: '天',
        weekly: '周',
        monthly: '月',
        yearly: '年'
    }
    return map[useEventData.currentEvent.recurrence.type]
})

// 开关处理
const handleRepeatSwitch = async (val: boolean) => {
    if (val) {
        // 开启重复逻辑
        showRepeatDialog.value = true
        Object.assign(useEventData.currentEvent.recurrence, {
            type: 'daily',
            interval: 1,
            daysOfWeek: [],
            endCondition: 'never',
            occurrences: 1,
            endDate: ''
        })
    } else {
        // 关闭重复时触发二次确认
        try {
            await ElMessageBox.confirm(
                '关闭重复将重置该日程的重复设置，是否继续？',
                '确认关闭',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                }
            )

            // 用户确认关闭
            useEventData.currentEvent.repeat = false
            Object.assign(useEventData.currentEvent.recurrence, {
                type: 'daily',
                interval: 1,
                daysOfWeek: [],
                endCondition: 'never',
                occurrences: 1,
                endDate: ''
            })
        } catch (error) {
            // 用户取消操作，恢复开关状态
            useEventData.currentEvent.repeat = true
        }
    }
}

// 确认设置
const confirmRepeat = () => {
    const rule: Partial<RecurrenceRule> = {
        ...useEventData.currentEvent.recurrence,
        daysOfWeek: useEventData.currentEvent.recurrence.daysOfWeek as number[]
    };

    if (rule.endCondition !== 'occurrences') delete rule.occurrences;
    if (rule.endCondition !== 'untilDate') delete rule.endDate;
    if (rule.type !== 'weekly') delete rule.daysOfWeek;

    useEventData.currentEvent.recurrence = rule as RecurrenceRule;
    showRepeatDialog.value = false;
}


// 修复 5: 调整提交逻辑
const submitEvent = async () => {
    try {
        const weeklyMeeting: ScheduleEvent = {
            id: '1234567890',
            title: '每周项目例会',
            category: '工作',
            start: new Date('2025-04-15T09:00:00'),
            end: new Date('2025-04-15T10:00:00'),
            allDay: false,
            location: '公司会议室A',
            description: '讨论项目进度和解决遇到的问题。',
            repeat: true,
            recurrence: {
                type: 'weekly',
                interval: 1,
                daysOfWeek: [2], // 每周二，0 表示周日，1 表示周一，以此类推
                endCondition: 'untilDate',
                endDate: new Date('2025-12-31')
            }
        };
        await useScheduleStore.addEvent(weeklyMeeting);
        console.log('创建成功');
    } catch (error) {
        console.error('创建失败:', error);
    }
};

const deleteEvent = async () => {
    try {
        await useScheduleStore.deleteEvent('3328e07f-dba5-450d-a8f0-738b80cf9bfa');
        console.log('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
    }
};


const durationText = computed(() => {
    if (!useEventData.currentEvent.start || !useEventData.currentEvent.end) return ' '

    const diffMinutes = dayjs(useEventData.currentEvent.end).diff(useEventData.currentEvent.start, 'minute')
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}小时${minutes}分钟`
})


watch(() => useEventData.currentEvent, (newVal) => {
    if (useEventData.selectedIndex !== -1 && useEventData.currentWeekEvents[useEventData.selectedIndex]) {
        newVal = {
            ...newVal,
            start: new Date(newVal.start),
            end: new Date(newVal.end),
        }
        if (newVal.title === '') {
            newVal = {
                ...newVal,
                title: '新事项'
            }
        }
        useEventData.currentRects[useEventData.selectedIndex] = getRectPositionFromTimeRange(newVal);
        useEventData.currentWeekEvents.splice(useEventData.selectedIndex, 1, { ...newVal });
        useScheduleStore.updateEvent(newVal);

    }
}, { deep: true, immediate: true });

</script>


<style scoped>
* {
    user-select: none;
}

.event-form {
    display: flex;
    width: 90%;
    height: inherit;
    transform: translateY(50px);
}

.ml-2 {
    margin-left: 8px;
}

.custom-select :deep(.el-input__inner) {
    border-color: #000000;
    border-radius: 8px;
    background-color: #fff5f5;
}
</style>
