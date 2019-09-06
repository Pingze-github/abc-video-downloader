import { app, BrowserWindow, ipcMain, shell } from 'electron';

import { Video, createPageFromPlain, Resource } from '../lib/video/video';


/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\');
}

let mainWindow;
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
  });

  mainWindow.loadURL(winURL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 进程通信
process.on('unhandledRejection', (err) => {
  console.error('[UR]', err);
});

ipcMain.on('main-start', async (event, arg) => {
  // const av = new Video('https://www.bilibili.com/video/av66186440/');

  console.log('接收到开始信号');

  const av = new Video('https://www.bilibili.com/video/av22146479/');

  await av.fetchInfo();
  event.sender.send('set-render-base', av.baseInfo());
  event.sender.send('set-render-pages', av.pagesPlain());
});

ipcMain.on('main-select-page', async (event, pagePlain) => {
  const page = createPageFromPlain(pagePlain);
  // TODO: 部分分p，数据形式是durl而非dash，需要兼容
  await page.fetchSourceInfo();
  event.sender.send('set-render-resources', page.resources());
  // var page = new Page();
  // page
  // await page.fetchSourceInfo();
  // var resource = page.source.getResourceByQuality();
  // console.log(resource);
});

ipcMain.on('main-open-file', (event, fpath) => {
  console.log(fpath);
  shell.openItem(fpath);
});

ipcMain.on('main-download', async (event, { id, resource, page, base, fpath }) => {
  console.log('main-download', resource);
  const resourcer = new Resource({
    videoObj: resource.video,
    audioObj: resource.audio,
    fpath: fpath,
    beatInterval: 500,
    videoCallback: ({ progress, speed }) => {
      console.log("callback", progress, speed);
      event.sender.send('set-render-download-progress', {
        id,
        percent: parseInt(progress * 100),
        speed: speed,
        status: 'active',
      });
    },
    audioCallback: () => { },
  });
  try {
    await resourcer.download();
  } catch (err) {
    console.log('捕捉下载错误', err);
    console.log(err);
    event.sender.send('set-render-download-progress', {
      id,
      status: 'wrong',
    });
  }
  event.sender.send('set-render-download-progress', {
    id,
    percent: 100,
    status: 'success',
  });
});


/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
