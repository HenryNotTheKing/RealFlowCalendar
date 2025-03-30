import { createRouter, createWebHistory } from 'vue-router';
import Calendar from '../views/CalendarView.vue';
import Gantt from '../views/GanttView.vue'; 
import Todo from '../views/TodoView.vue';

const routes = [
  {
    path: '/',
    name: 'Calendar',
    component: Calendar
  },
  {
    path: '/Gantt',
    name: 'Gantt',
    component: Gantt
  },
  {
    path: '/Todo',
    name: 'Todo',
    component: Todo
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;