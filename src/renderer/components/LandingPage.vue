<template>
  <div id="wrapper">
    <div id="download-list">
      <div id="downloader" v-for="downloader in downloadList" v-bind:key="downloader.id">
        <span>{{downloader.title}}</span>
        <span v-if="downloader.status==='active'">{{downloader.speed}}</span>
        <a v-if="downloader.status==='success'" @click="openFile(downloader.fpath)">打开文件</a>
        <Progress :percent="downloader.percent" :status="downloader.status"></Progress>
      </div>
    </div>

    <Divider />

    <div class="title">{{ base.title }}</div>

    <div id="pages">
      <div>选择分P：</div>

      <RadioGroup v-model="pageIndex" type="button" size="large" @on-change="onPageSelect">
        <Radio v-for="(page, index) in pages" v-bind:key="index" :label="index">{{page.title}}</Radio>
      </RadioGroup>

      <div>选择清晰度：</div>
      <div>视频：</div>
      <RadioGroup
        v-model="resourceVideoIndex"
        type="button"
        size="large"
        @on-change="onResourceSelect"
      >
        <Radio
          v-for="(video, index) in resourceVideos"
          v-bind:key="index"
          :label="index"
        >{{video.width}}x{{video.height}} {{video.codecs.substring(0, video.codecs.indexOf('.'))}}</Radio>
      </RadioGroup>

      <div>音频：</div>
      <RadioGroup
        v-model="resourceAudioIndex"
        type="button"
        size="large"
        @on-change="onResourceSelect"
      >
        <Radio
          v-for="(audio, index) in resourceAudios"
          v-bind:key="index"
          :label="index"
        >{{audio.width}}x{{audio.height}} {{audio.codecs.substring(0, audio.codecs.indexOf('.'))}}</Radio>
      </RadioGroup>

      <Divider />
      <Button
        size="large"
        icon="ios-download-outline"
        type="primary"
        :disabled="!canDownload"
        @click="download"
      >Download</Button>
    </div>
  </div>
</template>

<script>
import SystemInformation from "./LandingPage/SystemInformation";
const { ipcRenderer } = window.require("electron");

export default {
  name: "video-page",
  components: { SystemInformation },
  data: () => {
    return {
      base: {},
      // 数据被自动添加（覆写）了index属性，这是ipc序列化时产生的
      pages: [],
      pageIndex: -1,
      resourceVideos: [],
      resourceVideoIndex: -1,
      resourceAudios: [],
      resourceAudioIndex: -1,

      downloadList: []
    };
  },
  // 适用于一方改变多方重置的场景
  watch: {
    pageIndex: function() {
      this.resourceVideoIndex = -1;
      this.resourceAudioIndex = -1;
    }
  },
  // 适用于受到多方影响产生计算结果的场景
  computed: {
    canDownload: function() {
      return (
        this.pageIndex > -1 &&
        this.resourceVideoIndex > -1 &&
        this.resourceAudioIndex > -1
      );
    }
  },
  methods: {
    open(link) {
      this.$electron.shell.openExternal(link);
    },
    // 触发方案
    onPageSelect(index) {
      console.log("select-page", index, this.pages[index]);
      console.log({
        avid: this.base.avid,
        pid: this.pages[index].pid
      });
      ipcRenderer.send("main-select-page", {
        avid: this.base.avid,
        pid: this.pages[index].pid
      });
    },
    onResourceSelect(index) {
      console.log(this.resourceVideos[index]);
    },
    download() {
      console.log("Start Download");
      const id = Date.now().toString();
      const base = this.base;
      const page = this.pages[this.pageIndex];
      const video = this.resourceVideos[this.resourceVideoIndex];
      const audio = this.resourceAudios[this.resourceAudioIndex];
      const fpath = `g:/${base.title}_${page.title}_${video.quality}_${video.height}P.mp4`;
      ipcRenderer.send("main-download", {
        id,
        base,
        page,
        resource: {
          video: video,
          audio: audio
        },
        fpath
      });
      this.downloadList.push({
        id,
        title: page.title,
        percent: 0,
        speed: "",
        dstatus: "active",
        fpath
      });
    },
    openFile(fpath) {
      console.log("打开文件", fpath);
      ipcRenderer.send("main-open-file", fpath);
    }
    // 工具方法
    // transSecondsFormat(sec) {
    //   const partSec = sec % 60;
    //   const partMin = parseInt(sec / 60);
    //   const partHour = parseInt(sec / 3600);
    //   return partSec;
    // }
  },
  mounted() {
    ipcRenderer.send("main-start");
    ipcRenderer.on("set-render-base", (event, base) => {
      this.base = base;
    });
    ipcRenderer.on("set-render-pages", (event, pages) => {
      console.log("Pages", pages);
      this.pages = pages;
    });
    ipcRenderer.on("set-render-resources", (event, resources) => {
      console.log("resources", resources);
      this.resourceVideos = resources.videos;
      this.resourceAudios = resources.audios;
    });
    ipcRenderer.on(
      "set-render-download-progress",
      (event, { id, percent, speed, status }) => {
        let downloader;
        for (const d of this.downloadList) {
          if (d.id === id) {
            downloader = d;
            break;
          }
        }
        console.log("downloader", downloader);
        if (downloader) {
          percent = percent > 100 ? 100 : percent;
          downloader.percent = percent || downloader.percent;
          downloader.speed = speed || downloader.speed;
          downloader.status = status || downloader.status;
        }
      }
    );
  }
};
</script>

<style>
.select-card li {
  list-style-type: none;
  padding-left: 8px;
}
</style>
