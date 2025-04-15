import { ScheduleEvent, Rect } from "../types/schedule";
import { defineStore } from "pinia";
import { ref } from "vue";
import { ScheduleStore } from "./ScheduleStore";
   
 
export const EventData = defineStore("eventData", () => {

    const currentRects = ref<Rect[]>([]);
    const selectedIndex = ref<number>(-1);
    const currentWeekEvents = ref<ScheduleEvent[]>([]);
    const currentEvent = ref<ScheduleEvent>({
        id: "",
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
        currentRects,
        selectedIndex,
        currentWeekEvents,
        currentEvent
    }
})