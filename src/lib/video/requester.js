const request = require('request');
const requestPromise = require('request-promise');

const options = {
  headers: {
    Referer: 'https://www.bilibili.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
    Connection: 'keep-alive',
    // 'Sec-Fetch-Site': 'none',
    // 'Pragma': 'no-cache',
    // 'Cache-Control': 'no-cache',
    // 这里加一个CURRENT_QUALITY=112很重要，代表1080+，不然不会返回超清源
    Cookie: 'buvid3=72DBE271-2164-41C4-A0A7-7314BCCC560B41840infoc; rpdid=ippspiwqidosiqkxpqqw; fts=1529751515; im_notify_type_1407546=0; stardustvideo=1; CURRENT_FNVAL=16; LIVE_BUVID=221dfc41b347f122a5b32a90814e4f8e; LIVE_BUVID__ckMd5=0ef0bf4627f24e2d; sid=kiwl791k; balh_server_inner=https://biliplus.ipcjs.top; UM_distinctid=16c0eb4f9a276-0a336526b1957a-c343162-1fa400-16c0eb4f9a35c8; CURRENT_QUALITY=112; _uuid=A58629F1-6382-315E-2D8F-6DABC884793224576infoc; DedeUserID=1407546; DedeUserID__ckMd5=d375020bcf8614cb; SESSDATA=e6a8f84a%2C1569667738%2Ceff38081; bili_jct=88e9c004fbd16c6e7b9550ef0991481a; bp_t_offset_1407546=294782292932544502',
  },
  rejectUnauthorized: false,
  followRedirect: true,
  // gzip: true,
  // proxy: 'http://127.0.0.1:8888',
};

const requester = request.defaults(options);
const requesterPromise = requestPromise.defaults(options);

module.exports = {
  requester,
  requesterPromise,
};
