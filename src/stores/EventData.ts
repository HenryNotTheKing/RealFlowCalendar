import { ScheduleEvent } from "../types/schedule";
import { defineStore } from "pinia";
import { ref } from "vue";
import { ScheduleStore } from "./ScheduleStore";


export const EventData = defineStore("eventData", () => {
    const useScheduleStore = ScheduleStore();
    const currentWeekEvents = ref<ScheduleEvent[]>([]);
    const currentEvent = ref<ScheduleEvent>({
        id: 0,
        index: 0,
        title: "",
        start: new Date(),
        end: new Date(),
        location: "",
        description: "",
        category: "",
        allDay: false,
        repeat: false,
        recurrence: {
            type: "daily",
            interval: 1,
            endCondition: "occurrences",
            occurrences: 1,
            daysOfWeek: []
        }
    });
    return {
        currentWeekEvents,
        currentEvent
    }
})