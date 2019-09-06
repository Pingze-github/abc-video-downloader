

const { Video } = require('./video');
const Downloader = require('./Downloader');

process.on('unhandledRejection', (rej) => { console.error("捕捉到错误", rej.message); });


async function main() {
  const av = new Video('https://www.bilibili.com/video/av66186440/');
  // const av = new Video('https://www.bilibili.com/video/av22146479/');

  console.log(av.avid);

  await av.fetchInfo();

  const pages = av.pages();

  const pageF = pages[0];

  await pageF.fetchSourceInfo();

  console.log(pageF.source.acceptQuality());
  const resource = pageF.source.getResourceByQuality(16);

  await resource.download(`${av.avid}.mp4`);
  // var url = 'http://cn-zjwz3-dx-v-04.acgvideo.com/upgcxcode/69/11/114791169/114791169_nb2-1-30032.m4s?expires=1567509300&platform=pc&ssig=hTymYqcEBwH3CKaintTcoA&oi=2033983670&trid=32a19a8776c948ddb03295f2825efc98u&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=1407546'
  // var downloader = new Downloader(url, './断点续传测试.mp4', true);
  // await downloader.download();
}

main();

// TODO: 测试下 断点续传。就是从指定位置下载和追加。
// 注意文件名应该能够区分格式等
// 百分比仍然应该保存
