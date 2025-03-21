import { app, BrowserWindow } from "electron";
import url from "url";
import path from "path";
let __filename = url.fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1e3,
    height: 600,
    icon: "electron/resource/image/Icon.ico",
    autoHideMenuBar: true,
    // 新增以下配置关闭控制台窗口
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.mjs")
    },
    // 新增以下配置隐藏默认框架
    frame: false,
    // 去除默认窗口框架
    titleBarStyle: "hidden"
    // titleBarOverlay: {
    //     color: '#2f3241',      // 自定义标题栏颜色
    //     symbolColor: '#74b1be' // 控制按钮颜色
    // }
  });
  if (process.env["VITE_DEV_SERVER_URL"]) {
    mainWindow.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    mainWindow.loadFile("dist/index.html");
  }
};
app.whenReady().then(() => {
  createWindow();
});
