import { app, BrowserWindow } from "electron";
import url from "url";
import path from "path";
let __filename = url.fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: "electron/resource/image/Icon.ico",
    autoHideMenuBar: true,
    // 新增以下配置关闭控制台窗口
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.mjs")
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "white",
      // 自定义标题栏颜色
      symbolColor: "3D3D3D"
      // 控制按钮颜色
    },
    minWidth: 850,
    minHeight: 600,
    useContentSize: true
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
