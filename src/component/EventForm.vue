<template>
    <div class="event-form">
        <el-form :model="useEventData.currentEvent" label-width="auto" style="max-width: 300px">
            <el-form-item label="类别" label-position="top">
                <el-select 
                    v-model="useEventData.currentEvent.category" 
                    placeholder="请选择" 
                    class="custom-select"
                    id="category"
                >
                    <el-option v-for="item in useScheduleStore.options" :key="item.value" :label="item.label" :value="item.value"
                        class="custom-option" />
                </el-select>
            </el-form-item>
            <el-form-item label="标题" label-position="top">
                <el-input 
                    v-model="useEventData.currentEvent.title"
                    id="title"
                />
            </el-form-item>
            <el-form-item label="时间">
                <el-col :span="8">
                    <el-time-picker v-model="useEventData.currentEvent.start" format="HH:mm" :show-seconds="false" placeholder="开始"
                        style="width: 100%; font-size: 13px" :clearable="false" :disabled-hours="disableStartHours" :disabled-minutes="disableStartMinutes" @change="console.log(useEventData.currentWeekEvents)"/>
                </el-col>
                <el-col :span="2" class="text-center">
                    <div style="display: flex; justify-content: center; color: #3d3d3d">-</div>
                </el-col>
                <el-col :span="8">
                    <el-time-picker v-model="useEventData.currentEvent.end" format="HH:mm" :show-seconds="false" placeholder="结束"
                        style="width: 100%; font-size: 13px" :clearable="false"  :disabled-hours="disableEndHours" :disabled-minutes="disableEndMinutes"/>
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
                        <el-switch 
                            v-model="useEventData.currentEvent.allDay" 
                            id="allDay"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="8">
                    <el-form-item label="重复" v-if="useEventData.currentEvent.originalEventId === ''">
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
            :modal-append-to-body="true" @close='confirmRepeat'>
            <el-form :model="dialogRecurrence" label-width="100px">
                <!-- 重复类型 -->
                <el-form-item label="重复类型">
                    <el-select v-model="dialogRecurrence.type" placeholder="请选择">
                        <el-option v-for="(item, index) in repeatTypes" :key="index" 
                         :label="item.label" :value="item.value"/>
                    </el-select>
                </el-form-item>

                <!-- 间隔周期 -->
                <el-form-item label="每间隔">
                    <el-input-number v-model="dialogRecurrence.interval" :min="0" :max="365" />
                </el-form-item>

                <!-- 周重复时的星期选择 -->
                <el-form-item v-if="dialogRecurrence.type === 'weekly'" label="重复星期">
                    <el-checkbox-group v-model="dialogRecurrence.daysOfWeek">
                        <el-checkbox v-for="(day, index) in weekDays" :key="index" :label="index">
                            {{ day }}
                        </el-checkbox>
                    </el-checkbox-group>
                </el-form-item>

                <!-- 结束条件 -->
                <el-form-item label="结束条件">
                    <el-radio-group v-model="dialogRecurrence.endCondition">
                        <el-radio value="never">永不</el-radio>
                        <el-radio value="occurrences">重复次数</el-radio>
                        <el-radio value="untilDate">结束日期</el-radio>
                    </el-radio-group>
                </el-form-item>

                <!-- 次数输入 -->
                <el-form-item v-if="dialogRecurrence.endCondition === 'occurrences'" label="重复次数">
                    <el-input-number v-model="dialogRecurrence.occurrences" :min="1" :max="999" />
                </el-form-item>

                <!-- 结束日期 -->
                <el-form-item v-if="dialogRecurrence.endCondition === 'untilDate'" label="结束日期">
                    <el-date-picker v-model="dialogRecurrence.endDate" placeholder="选择结束日期" 
                    :disabled-date="(date: Date) => {
                      const start = useEventData.currentEvent.start;
                     return start ? date < new Date(start.setHours(0,0,0,0)) : false;
                    }"/>
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="cancel">取消</el-button>
                <el-button type="primary" @click="confirmRepeat">确定</el-button>
            </template>
        </el-dialog> 
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { ScheduleStore } from '../stores/ScheduleStore'
import { EventData } from '../stores/EventData';
import { cloneDeep } from 'lodash-es'
import type { RecurrenceRule } from '../types/schedule';
import { ElMessageBox } from 'element-plus'

const useEventData = EventData();
const useScheduleStore = ScheduleStore();

function cancel() {
    showRepeatDialog.value = false;
    useEventData.currentEvent.repeat = false;
    dialogRecurrence.value = useEventData.resetRecurrence();

}
// 专门用于对话框的重复规则缓存
const dialogRecurrence = ref<RecurrenceRule>(cloneDeep({...useEventData.currentEvent.recurrence, interval: 0}))

watch(() => useEventData.currentEvent, (newVal) => {
    if (useEventData.selectedIndex !== -1 && useEventData.currentWeekEvents[useEventData.selectedIndex]&& useScheduleStore.isOperatingForm) {
        newVal = {
            ...newVal,
            start: new Date(newVal.start),
            end: new Date(newVal.end),
        }
        if (newVal.title === '') {
            newVal = {
                ...newVal,
                title: '新事项',
            }
        }
        useScheduleStore.updateEvent(newVal);
    }
}, { deep: true, immediate: true });
// 修复 1: 明确表单类型

const showRepeatDialog = ref(false)

// 可用选项
const repeatTypes = [
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'yearly', label: '每年' }
]

const weekDays = [ '周一', '周二', '周三', '周四', '周五', '周六','周日']


// 开关处理
const handleRepeatSwitch = async (val: boolean) => {
    if (val) {
        // 开启重复逻辑
        showRepeatDialog.value = true
    }
    // else{ ElMessageBox.confirm(
    //     '你确认要取消该重复事件吗：',
    //     {
    //       distinguishCancelAndClose: false,
    //       confirmButtonText: '确定',
    //       cancelButtonText: '取消',
    //       type: 'warning'
    //     }
    //   ).then(() => {
    //     useScheduleStore.deleteEvent(useEventData.currentEvent, true);
    //     useEventData.selectedIndex = -1;
    //   })
    // }
}
    


// 确认设置
const confirmRepeat = () => {
    Object.assign(useEventData.currentEvent.recurrence, {...dialogRecurrence.value,interval: Number(dialogRecurrence.value.interval + 1)})
    showRepeatDialog.value = false;
}

const durationText = computed(() => {
    if (!useEventData.currentEvent.start || !useEventData.currentEvent.end) return ' '
    const diffMinutes = dayjs(useEventData.currentEvent.end).diff(useEventData.currentEvent.start, 'minute')
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}小时${minutes}分钟`
})
const disableStartHours = () => {
    if (!useEventData.currentEvent.end) return [];
    const endHour = dayjs(useEventData.currentEvent.end).hour();
    if(dayjs(useEventData.currentEvent.end).minute() < dayjs(useEventData.currentEvent.start).minute()) {
        return Array.from({length: 24}, (_, i) => i).filter(h => h > endHour - 1)}
    else {
        return Array.from({length: 24}, (_, i) => i).filter(h => h > endHour);}
};

const disableStartMinutes = (selectedHour: number) => {
    if (!useEventData.currentEvent.end) return [];
    const end = dayjs(useEventData.currentEvent.end);
    if (selectedHour === end.hour()) {
        // 新增5分钟最小间隔限制
        const minAllowed = end.minute() - 15;
        return Array.from({length: 60}, (_, i) => i).filter(m => m >= minAllowed);
    }
    return [];
};

const disableEndHours = () => {
    if (!useEventData.currentEvent.start) return [];
    const startHour = dayjs(useEventData.currentEvent.start).hour();
    if(dayjs(useEventData.currentEvent.end).minute() > dayjs(useEventData.currentEvent.start).minute()) {
        return Array.from({length: 24}, (_, i) => i).filter(h => h < startHour + 1)}
    else {
        return Array.from({length: 24}, (_, i) => i).filter(h => h < startHour);}
};

const disableEndMinutes = (selectedHour: number) => {
    if (!useEventData.currentEvent.start) return [];
    const start = dayjs(useEventData.currentEvent.start);
    if (selectedHour === start.hour()) {
        // 新增5分钟最小间隔限制
        const maxAllowed = start.minute() + 15;
        return Array.from({length: 60}, (_, i) => i).filter(m => m <= maxAllowed);
    }
    return [];
};
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
