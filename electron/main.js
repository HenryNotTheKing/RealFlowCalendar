import { app, BrowserWindow } from "electron"
import url from 'url'
import path from 'path'

let __filename = url.fileURLToPath(import.meta.url)
let __dirname = path.dirname(__filename)

//创建窗口
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        icon: "electron/resource/image/Icon.ico",
        autoHideMenuBar: true,
        // 新增以下配置关闭控制台窗口
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.resolve(__dirname, "preload.mjs"),
        },
        // 新增以下配置隐藏默认框架
        // frame: false,            // 去除默认窗口框架
        // titleBarStyle: 'hidden', 
        // // titleBarOverlay: {
        //     color: '#2f3241',      // 自定义标题栏颜色
        //     symbolColor: '#74b1be' // 控制按钮颜色
        // }
    })
    //mainWindow.loadURL("http://localhost:5173")
    //VITE DEV_SERVER URL是开发服务器的ur1,只在开发环境中存在
    if(process.env['VITE_DEV_SERVER_URL']){
        mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'])
        }else{
        mainWindow.loadFile('dist/index.html')
        //mainWindow.loadFile(path.resolve(dirname,"../dist/index.html"))
        }
}
//当应用准备就绪后创建窗口
app.whenReady().then(() => {
    createWindow()
})