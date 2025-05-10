import { ScheduleEvent, Rect} from "../types/schedule";
import { defineStore } from "pinia";
import { ref } from "vue";
   
 
export const EventData = defineStore("eventData", () => {
    
    const colorMap = <Record<string, Record<string, string>>>{
        'Blue': deriveColors('#409EFF'),
        'Green': deriveColors('#67C23A'),
        'Yellow': deriveColors('#E6A23C'),
        'Red': deriveColors('#E91E63'),
        'Purple': deriveColors('#9C27B0'),
        '': deriveColors('#409EFF'),
      }
      
      // 添加颜色派生函数
      function deriveColors(baseColor: string) {
        return {
          '--baseColor': baseColor,
          '--shallow': `color-mix(in srgb, ${baseColor} 20%, white)`,
          '--deep': `color-mix(in srgb, ${baseColor} 100%, black)`,
          '--shadow': `color-mix(in srgb, ${baseColor} 30%, black)`,
          '--text': `color-mix(in srgb, ${baseColor} 45%, black)`
        }
      }
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
        },
        originalEventId: "",
        exceptions: []
    });
    const resetRecurrence = () => {
        currentEvent.value.recurrence = {
            type: "daily",
            interval: 1,
            endCondition: "occurrences",
            occurrences: 1,
            daysOfWeek: []
        }
        return currentEvent.value.recurrence;
    }
    const resetCurrentEvent = () => {
        currentEvent.value = {
            id: "",
            title: "",
            start: new Date(),
            end: new Date(),
            location: "",
            description: "",
            category: "",
            allDay: false,
            repeat: false,
            recurrence: resetRecurrence(),
            originalEventId: "",
            exceptions: []
        }
    }
    return {
        currentRects,
        selectedIndex,
        currentWeekEvents,
        currentEvent,
        colorMap,
        resetRecurrence,
        resetCurrentEvent
    }
})