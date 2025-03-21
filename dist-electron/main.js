import { app as r, BrowserWindow as t } from "electron";
import i from "url";
import o from "path";
let n = i.fileURLToPath(import.meta.url), a = o.dirname(n);
const l = () => {
  const e = new t({
    width: 1e3,
    height: 600,
    icon: "electron/resource/image/Icon.ico",
    autoHideMenuBar: !0,
    // 新增以下配置关闭控制台窗口
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !0,
      preload: o.resolve(a, "preload.mjs")
    },
    // 新增以下配置隐藏默认框架
    frame: !1,
    // 去除默认窗口框架
    titleBarStyle: "hidden"
    // titleBarOverlay: {
    //     color: '#2f3241',      // 自定义标题栏颜色
    //     symbolColor: '#74b1be' // 控制按钮颜色
    // }
  });
  process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile("dist/index.html");
};
r.whenReady().then(() => {
  l();
});
