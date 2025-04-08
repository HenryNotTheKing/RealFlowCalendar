<template>
  <div class="chen-calendar">
    <!-- 折叠头部 -->
    <div class="calendar-collapse-header" @click.stop="toggleCollapse">
      <img
        src="../assets/Icons/icon-collapse-on.svg"
        v-if="!isCollapsed"
        alt="collapse-on"
        class="icon"
      />
      <img
        src="../assets/Icons/icon-collapse-off.svg"
        v-else
        alt="collapse-off"
        class="icon"
      />
      <span>日历（好直白）</span>
    </div>

    <!-- 日历内容 -->
    <div v-if="!isCollapsed" class="calendar-content">
      <!-- 日历头部 -->
      <div id="calendar-header">
        <div class="month-text">{{ monthText }}</div>
        <div class="month-switcher">
          <div class="arrow-container arrow-left" @click="toPrevMonth">
            <img
              src="../assets/Icons/icon-arrow-left.svg"
              alt="arrow-left"
              class="icon"
            />
          </div>
          <div class="arrow-container arrow-right" @click="toNextMonth">
            <img
              src="../assets/Icons/icon-arrow-right.svg"
              alt="arrow-right"
              class="icon"
            />
          </div>
        </div>
      </div>

      <!-- 星期显示 -->
      <div id="calendar-week">
        <div class="week-item" v-for="(week, idx) in weekList" :key="idx">
          {{ week }}
        </div>
      </div>

      <!-- 日期表格 -->
      <div id="calendar-table">
        <div class="calendar-content">
          <div
            class="calendar-date"
            v-for="(date, idx) in dateList"
            :key="idx"
            @click="handleDateClick(date)"
          >
            <div
              class="date-text"
              :class="{
                'date-selected': isDateSelected(date),
                'date-today': date.isToday,
                'date-curr-month': date.isCurrMonth,
                'date-prev-month': date.isPrevMonth,
                'date-next-month': date.isNextMonth,
              }"
            >
              {{ date.day }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const DayMS = 24 * 60 * 60 * 1000;

export default {
  name: "ChenCalendar",
  data() {
    return {
      selectedDate: null,
      todayDate: new Date(),
      isCollapsed: false, // 控制折叠状态
      weekList: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      monthDateList: [],
    };
  },
  computed: {
    monthText() {
      const year = this.todayDate.getFullYear();
      const month = (this.todayDate.getMonth() + 1).toString().padStart(2, "0");
      return `${year}年 ${month}月`;
    },
    dateList() {
      return this.monthDateList;
    },
  },
  methods: {
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    },
    toPrevMonth() {
      this.selectedDate = null;
      this.todayDate = this.getPrevMonthDate(this.todayDate);
      this.updateMonthDateList();
      this.checkTodayInCurrentMonth();
    },
    toNextMonth() {
      this.selectedDate = null;
      this.todayDate = this.getNextMonthDate(this.todayDate);
      this.updateMonthDateList();
      this.checkTodayInCurrentMonth();
    },
    checkTodayInCurrentMonth() {
      const today = new Date();
      if (
        this.todayDate.getFullYear() === today.getFullYear() &&
        this.todayDate.getMonth() === today.getMonth()
      ) {
        this.selectedDate = today;
      }
    },
    updateMonthDateList() {
      this.monthDateList = this.getMonthDateList(this.todayDate);
    },
    isDateSelected(dateItem) {
      return this.selectedDate && this.isEqualDate(dateItem.date, this.selectedDate);
    },
    handleDateClick(date) {
      if (date.isPrevMonth) {
        this.toPrevMonth();
      } else if (date.isNextMonth) {
        this.toNextMonth();
      }
      this.selectedDate = date.date;
      this.updateMonthDateList();
    },
    isEqualDate(d1, d2) {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    },
    getFirstDate(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    },
    getLastDate(date) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    },
    getPrevTailDateList(date) {
      const dateList = [];
      const firstDate = this.getFirstDate(date);
      const firstDateTime = firstDate.getTime();
      const firstDateWeek = firstDate.getDay();
      for (let i = 0; i < firstDateWeek; i++) {
        const currDate = new Date(firstDateTime - (i + 1) * DayMS);
        dateList.unshift({
          date: currDate,
          isPrevMonth: true,
          day: currDate.getDate(),
        });
      }
      return dateList;
    },
    getNextHeadDateList(date, appendweek) {
      const dateList = [];
      const lastDate = this.getLastDate(date);
      const lastDateTime = lastDate.getTime();
      const lastDateWeek = lastDate.getDay();
      for (let i = 0; i < 6 - lastDateWeek + (appendweek ? 7 : 0); i++) {
        const currDate = new Date(lastDateTime + (i + 1) * DayMS);
        dateList.push({
          date: currDate,
          isNextMonth: true,
          day: currDate.getDate(),
        });
      }
      return dateList;
    },
    getCurrMonthDateList(date) {
      const dateList = [];
      const firstDate = this.getFirstDate(date);
      const lastDate = this.getLastDate(date);
      const today = new Date();
      for (let i = 1; i <= lastDate.getDate(); i++) {
        const currDate = new Date(firstDate);
        currDate.setDate(i);
        dateList.push({
          date: currDate,
          isCurrMonth: true,
          day: currDate.getDate(),
          isToday: this.isEqualDate(currDate, today),
        });
      }
      return dateList;
    },
    getMonthDateList(date) {
      const prevDateList = this.getPrevTailDateList(date);
      const currDateList = this.getCurrMonthDateList(date);
      const appendweek = (prevDateList.length + currDateList.length) <= 35;
      const nextDateList = this.getNextHeadDateList(date, appendweek);
      return prevDateList.concat(currDateList).concat(nextDateList);
    },
    getNextMonthDate(date) {
      const year = date.getFullYear();
      let nextYear = year;
      let nextMonth = (date.getMonth() + 1) + 1;
      let nextDay = date.getDate();
      if (nextMonth === 13) {
        nextYear += 1;
        nextMonth = 1;
      }
      const lastDay = new Date(nextYear, nextMonth, 0).getDate();
      if (nextDay > lastDay) {
        nextDay = lastDay;
      }
      return new Date(nextYear, nextMonth - 1, nextDay);
    },
    getPrevMonthDate(date) {
      let prevYear = date.getFullYear();
      let prevMonth = (date.getMonth() + 1) - 1;
      let prevDay = date.getDate();
      if (prevMonth === 0) {
        prevYear -= 1;
        prevMonth = 12;
      }
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      if (lastDay < prevDay) {
        prevDay = lastDay;
      }
      return new Date(prevYear, prevMonth - 1, prevDay);
    },
  },
  created() {
    this.selectedDate = new Date();
    this.updateMonthDateList();
  },
};
</script>

<style scoped>
/* 全局容器样式 */
.chen-calendar {
  width: 100%;
  max-width: 270px;
  margin: 0 auto;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  gap:0px;
  user-select: none;
}

/* 折叠头部样式 */
.calendar-collapse-header {
  height: 34px;
  padding-left: 0px;
  padding-right: 0px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 24px; /* 上间距，看着调一调 */
  margin-bottom: 0px; /* 下间距 */
  &:hover {
    background-color: #efefef;
  }
  span {
    margin-left: 8px;
    font-size: 14px;
    color: #646464;
  }
}

/* 图标样式 */
.icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

/* 日历头部样式 */
#calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px;
}

.month-text {
  font-size: 16px;
  font-weight: bold;
}

.month-switcher {
  display: flex;
  gap: 8px;
}

.arrow-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: #efefef;
  }
}

/* 星期显示样式 */
#calendar-week {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #999999;
}

.week-item {
  width: calc(100% / 7);
  text-align: center;
  font-size: 12px; 
}

/* 日期表格 */
#calendar-table {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin: 0; 
  padding: 0; 
  margin-left: 0px; 
}

.calendar-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.calendar-date {
  width: calc(100% / 7);
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  &:hover {
    background-color: #efefef;
  }
}

.date-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.date-selected {
  background-color: #f04842 !important;
  color: #ffffff !important;
}

.date-today {
  border: 2px solid #f04842;
  color: #f04842;
}

.date-curr-month {
  color: #333333;
}

.date-prev-month {
  color: #999999;
  cursor: not-allowed;
}

.date-next-month {
  color: #ccc;
}
</style>