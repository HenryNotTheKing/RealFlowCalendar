import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import axios from 'axios'

import 'element-plus/dist/index.css'
import './assets/background.css'

axios.defaults.baseURL = 'http://localhost:5000'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
