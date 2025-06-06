import { app, BrowserWindow } from "electron"
import { protocol } from 'electron'
import url from 'url'
import path from 'path'

let __filename = url.fileURLToPath(import.meta.url)
let __dirname = path.dirname(__filename)

//创建窗口
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        icon: "electron/resource/image/Icon3.png",
        autoHideMenuBar: true,
        // 新增以下配置关闭控制台窗口
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.resolve(__dirname, "preload.mjs"),
        },
        titleBarStyle: 'hidden',
         titleBarOverlay: {
            color: 'white',      // 自定义标题栏颜色
            symbolColor: '3D3D3D' // 控制按钮颜色
        },
        minWidth: 1000,
        minHeight: 600,
        useContentSize: true
    })
    //mainWindow.loadURL("http://localhost:5173")
    //VITE DEV_SERVER URL是开发服务器的ur1,只在开发环境中存在
    
    if(process.env['VITE_DEV_SERVER_URL']){
        mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'])
        }else{
        //mainWindow.loadFile('dist/index.html')
        mainWindow.loadFile(path.resolve(__dirname,"../dist/index.html"))
        }
}
//当应用准备就绪后创建窗口
app.whenReady().then(() => {
    createWindow()
})
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true
    }
  }
])