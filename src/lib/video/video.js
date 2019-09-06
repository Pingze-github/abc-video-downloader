
const { exec } = require('child_process');
const fs = require('fs');
const querystring = require("querystring");

const { requesterPromise } = require('./requester');
import Downloader from './Downloader';
import { ipcMain } from 'electron';

class Resource {
  constructor({ videoObj, audioObj, fpath, beatInterval, videoCallback, audioCallback }) {
    this.video = videoObj;
    this.audio = audioObj;
    this.fpath = fpath;
    if (!fpath) {
      throw new Error('Must set download file path');
    }
    this.videoCallback = videoCallback;
    this.audioCallback = audioCallback;
    this.beatInterval = beatInterval || 1000;
  }

  // 下载此资源
  // 自动合并
  async download() {
    const videoTempPath = `${this.fpath}.video`;
    const audioTempPath = `${this.fpath}.audio`;
    const videoDownloader = new Downloader(this.video.baseUrl, videoTempPath, this.beatInterval, this.videoCallback);
    const audioDownloader = new Downloader(this.audio.baseUrl, audioTempPath, this.beatInterval, this.audioCallback);

    await Promise.all([
      audioDownloader.download(),
      videoDownloader.download(),
    ]);

    // await audioDownloader.download();
    // await videoDownloader.download();

    const cmd = `ffmpeg -i "${videoTempPath}" -i "${audioTempPath}" -c copy -y "${this.fpath}"`;
    console.info(cmd);
    await new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        // 输出总是stderr，不可用于判断命令执行成功与否
        // if (stderr) return reject(new Error('ffmpeg run failed'))
        resolve();
      });
    });
    fs.unlinkSync(audioTempPath);
    fs.unlinkSync(videoTempPath);
  }
}

// 单p资源信息
class Source {
  constructor(avid, pid, jsonObj) {
    this.avid = avid;
    this.pid = pid;
    this.info = jsonObj;
  }

  acceptQuality() {
    return this.info.data.accept_quality;
  }

  getResourceByQuality(quality) {
    if (!quality) {
      quality = this.info.data.accept_quality[0];
    }
    let videoSelect;
    for (const video of this.info.data.dash.video) {
      // 无视格式，返回第一项
      // TODO: 全局配置选择优先格式
      if (video.id === quality) {
        videoSelect = video;
      }
    }
    if (!videoSelect) {
      throw new Error('Quality selected match no resource');
    }
    // 直接选择第一项质量最好的
    const audioSelect = this.info.data.dash.audio[0];
    return new Resource(videoSelect, audioSelect);
  }

  toPlain() {
    return {
      avid: this.avid,
      pid: this.pid,
      info: this.info,
    };
  }
}

function createSourceFromPlain(plain) {
  const source = new Source();
  source.avid = plain.avid;
  source.pid = plain.pid;
  source.info = plain.info;
  return source;
}

// 视频分p
class Page {
  constructor(avid, jsonObj, source) {
    this.avid = avid;
    if (!jsonObj) return;
    this.pid = jsonObj.cid;
    this.index = jsonObj.page;
    this.title = jsonObj.part;
    this.duration = jsonObj.duration;
    this.dimension = {
      width: jsonObj.dimension ? jsonObj.dimension.width : undefined,
      height: jsonObj.dimension ? jsonObj.dimension.height : undefined,
      rotate: jsonObj.dimension ? jsonObj.dimension.rotate : undefined,
    };
    this.source = source;
  }

  genSourceUrl() {
    this.sourceUrl = `https://api.bilibili.com/x/player/playurl?${querystring.stringify({
      avid: this.avid,
      cid: this.pid,
      // 指高质量
      qn: 112,
      otype: 'json',
      fnver: 0,
      fnval: 16,
    })}`;
    return this.sourceUrl;
  }

  async fetchSourceInfo() {
    if (this.source) {
      return this.source;
    }
    const sourceUrl = this.genSourceUrl();
    console.log(sourceUrl);
    const text = await requesterPromise({ uri: sourceUrl, gzip: true });
    this.source = new Source(this.avid, this.pid, JSON.parse(text));
  }

  toPlain() {
    return {
      pid: this.pid,
      avid: this.avid,
      index: this.index,
      title: this.title,
      duration: this.duration,
      dimension: this.dimension,
      sourceUrl: this.sourceUrl,
      source: this.source ? this.source.toPlain() : null,
    };
  }

  // 返回资源项
  resources() {
    const videos = this.source.info.data.dash.video.map(v => ({
      quality: v.id,
      baseUrl: v.baseUrl,
      mimeType: v.mimeType,
      codecs: v.codecs,
      width: v.width,
      height: v.height,
      frameRate: v.frameRate,
      bandwidth: v.bandwidth,
    }));
    const audios = this.source.info.data.dash.audio.map(v => ({
      quality: v.id,
      baseUrl: v.baseUrl,
      mimeType: v.mimeType,
      codecs: v.codecs,
      width: v.width,
      height: v.height,
      frameRate: v.frameRate,
      bandwidth: v.bandwidth,
    }));
    return { videos, audios };
  }
}

function createPageFromPlain(plain) {
  const page = new Page();
  page.avid = plain.avid;
  page.pid = plain.pid;
  page.avid = plain.avid;
  page.index = plain.index;
  page.title = plain.title;
  page.duration = plain.duration;
  page.dimension = plain.dimension;
  page.sourceUrl = plain.sourceUrl;
  page.source = plain.source ? createSourceFromPlain(plain.source) : null;
  return page;
}

// 视频
class Video {
  constructor(url) {
    this.avid = this._parseAVid(url);
    this.url = `https://www.bilibili.com/video/av${this.avid}/`;
  }

  _parseAVid(url) {
    const results = url.match(/av(\d+)/);
    if (!results) {
      throw new Error('Can\'t parse avid from url');
    }
    return results[1];
  }

  _parsePlayInfo(text) {
    const results = text.match(/(__playinfo__.+?)<\/script>/m);
    const code = results[1];
    return (() => {
      const __playinfo__ = {};
      eval(code);
      return __playinfo__;
    })();
  }

  _parseBaseInfo(text) {
    const results = text.match(/(__INITIAL_STATE__.+?)\(function\(\).+<\/script>/m);
    const code = results[1];
    return (() => {
      const __INITIAL_STATE__ = {};
      try {
        eval(code);
      } catch (e) {
        throw e;
      }
      return __INITIAL_STATE__;
    })();
  }

  // 获取进本信息
  async fetchInfo() {
    if (this.info) {
      return this.info;
    }
    const text = await requesterPromise({ uri: this.url, gzip: true });
    const playInfo = this._parsePlayInfo(text);
    const baseInfo = this._parseBaseInfo(text);
    this.info = { playInfo, baseInfo };

    // fs.writeFileSync(`cache/${this.avid}.json`, JSON.stringify(this.info, null, 2));

    return this.info;
  }

  baseInfo() {
    const videoData = this.info.baseInfo.videoData;
    return {
      avid: videoData.aid,
      tag: videoData.tname,
      cover: videoData.pic,
      title: videoData.title,
      ctime: videoData.ctime,
      desc: videoData.desc,
      owner: videoData.owner,
      pagesNum: videoData.pages.length,
    };
  }

  pages() {
    if (this.info.baseInfo.videoData.pages.length === 1) {
      const jo = this.info.baseInfo.videoData.pages[0];
      return [new Page(this.avid, jo, new Source(this.avid, jo.cid, this.info.playInfo))];
    }
    return this.info.baseInfo.videoData.pages.map(jo => new Page(this.avid, jo));
  }

  pagesPlain() {
    return this.pages().map(p => p.toPlain());
  }
}

// export default Video
export {
  Video,
  Page,
  Source,
  Resource,
  createPageFromPlain,
  createSourceFromPlain,
};

// TODO:
// av中应包含关键信息属性
// 可以选择p数，获取视频p数。不分p的默认为1p
// 选择p数后可以获取资源对象
// 针对资源对象提供下载方法

if (!module.parent) {
  async function main() {

    // console.log(info.playInfo.data.accept_description);
    // console.log(info.playInfo.data.accept_quality);

    // // 只有单p视频可以有dash属性

    // console.log('视频源数', info.playInfo.data.dash.video.length, '音频源数', info.playInfo.data.dash.audio.length);
    // console.log(info.playInfo.data.dash.video.map(v => ({ width: `${v.width}x${v.height}`, bandwidth: v.bandwidth, fr: v.frameRate })))
    // console.log(info.baseInfo.videoData.aid, info.baseInfo.videoData.title);

    // await av.download(av.avid + '.mp4');
    // console.log('资源下载任务完成');
  }
  main();
}

