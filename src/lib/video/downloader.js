

const fs = require('fs');
const { byteman } = require('./utils');
const { requester, requesterPromise } = require('./requester');

class Downloader {
  constructor(url, fpath, progressInterval, callback) {
    this.url = url;
    this.fpath = fpath;
    this.totalBytes = 0;
    this.receivedBytes = 0;
    this.progress = 0;
    this.lastReceivedBytes = 0;
    this.buffer = Buffer.from('');
    // 当出现Parse Error时，pipe无法进行，需要手动收集数据并写入文件。
    this.manul = false;
    this.progressInterval = progressInterval;
    this.callback = callback;
    this.failed = false;
  }

  async download() {
    try {
      const stat = fs.statSync(this.fpath);
      console.log('断点续传');
      await this._download(this.url, stat.size);
    } catch (e) {
      await this._download(this.url);
    }
  }

  _download(url, cacheSize) {
    return new Promise((resolve, reject) => {
      // 定时显示进度
      let timer = null;
      if (this.callback) {
        timer = setInterval(() => {
          const bytesPerSec = (this.receivedBytes - this.lastReceivedBytes) / (this.progressInterval / 1000);
          this.lastReceivedBytes = this.receivedBytes;
          this.callback({
            progress: this.progress,
            speed: `${parseInt(bytesPerSec / 1024)}KB/s`
          });
        }, this.progressInterval);
      }

      // 创建文件流
      const stream = fs.createWriteStream(this.fpath, { flags: 'w' });
      stream.on('finish', () => {
        if (timer) clearInterval(timer);
        resolve();
      });

      // 创建请求
      const req = requester({
        uri: url || this.url,
      });

      // 文件流创建失败
      stream.on('error', (err) => {
        clearTimeout(timer);
        req.end();
        return reject(err);
      });

      req.on('response', (res) => {
        // 在这里获取到总文件size
        // 可能多次收取，跟踪跳转
        if (res.statusCode !== 200) {
          clearTimeout(timer);
          req.end();
          return reject(new Error('Server returns no 200'));
        }
        this.totalBytes = parseInt(res.headers['content-length'], 10);
        console.log('下载体积:', byteman(this.totalBytes));
        console.log('response: content-length', this.totalBytes);
      });

      req.on('data', (chunk) => {
        if (this.manul) {
          this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        // chunk大小自行确定
        this.receivedBytes += chunk.length;
        this.progress = this.receivedBytes / this.totalBytes;
        // console.log('data', this.receivedBytes);
      });

      req.on('end', () => {
        // console.log('req end')
        if (this.manul && this.receivedBytes === this.totalBytes && this.receivedBytes === this.buffer.length) {
          fs.writeFileSync(this.fpath, this.buffer, 'w');
          stream.end();
        }
      });

      req.on('error', (err) => {
        // FIXME: 关键在于，如何在这里出错时，还保证stream能正常传输。
        console.error("请求遭遇错误：");
        console.error(err);

        // clearTimeout(timer);
        // req.end();
        // return reject(new Error(err));

        this.manul = true;
      });

      req.pipe(stream);
    });
  }
}

export default Downloader;
