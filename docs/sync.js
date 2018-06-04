/**
 * 拉取线上上传素材，和项目同步
 */
var fs = require('fs');
stat = fs.stat;

var path = require('path');
var url = require('url');

var http = require('http');

const build = require('./build.js');

// 线上根路径和JSON文件地址
const urlRoot = 'http://localhost/GitHub/story/upload/temp/';
const urlConfigJSON = urlRoot + 'config.json';
// 本地JSON
const pathLocalConfig = './config.json';

// 定义同步方法
const fnSync = function (remoteData, localData) {
    let dataSync = [];
    for (var keyYmd in remoteData) {
        // 将keyYmd分割成年月和日
        let yearMonth = keyYmd.slice(0, 6);
        let day = keyYmd.slice(-2);
        // 需要拉取的图片资源地址和HTML页面地址
        let arrSource = [];
        let filenameHTML = '';
        // 本地无这一天数据，直接全部更新
        if (typeof localData[keyYmd] == 'undefined') {
            // 此时所有图片和页面都是拉取资源
            arrSource = remoteData[keyYmd].sourceList;
            filenameHTML = day + '.html';
        } else {
            // sourceIndex和htmlVersion比对，如果不一样，更新
            var indexDistance = localData[keyYmd].sourceIndex - remoteData[keyYmd].sourceIndex;
            if (indexDistance < 0) {
                arrSource = remoteData[keyYmd].sourceList.slice(indexDistance);
            }
            // 页面版本比对
            if (localData[keyYmd].htmlVersion != remoteData[keyYmd].htmlVersion) {
                filenameHTML = day + '.html';
            }
        }

        // 把需要拉取的资源变成url地址存储的一维数组
        if (arrSource.length) {
            arrSource.forEach(function (filename) {
                dataSync.push({
                    remoteUrl: urlRoot + 'images/' + yearMonth + '/' + filename,
                    localPath: path.join('./images', yearMonth, filename)
                });
            });
        }

        if (filenameHTML) {
            dataSync.push({
                remoteUrl: urlRoot + yearMonth + '/' + filenameHTML,
                localPath: path.join(yearMonth, filenameHTML)
            });
        }
    }

    // 开始对比对出来需要更新的资源进行拉取
    if (dataSync.length == 0) {
        console.log('没有需要同步的资源');
        return;
    }

    let start = 0, length = dataSync.length;
    var step = function () {
        var obj = dataSync[start];
        if (!obj) {
            console.log('资源全部同步完成，更新本地config.json');
            fs.writeFile(pathLocalConfig, JSON.stringify(remoteData), (err) => {
              console.log('本地config.json更新成功，同步结束，开始生成页面');
              build.init();
            });
            return;
        }
        console.log('正在同步资源' + obj.remoteUrl);
        http.get(obj.remoteUrl, (res) => {
          const { statusCode } = res;

          let error;
          if (statusCode !== 200) {
            error = new Error('请求失败。\n' +
                              `状态码: ${statusCode}`);
          }
          if (error) {
            console.error(error.message);
            // 消耗响应数据以释放内存
            res.resume();
            return;
          }

          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            //本地写入
            fs.writeFile(obj.localPath, rawData, (err) => {
              if (err) throw err;
              start++;
              step();
            });
          });
        }).on('error', (e) => {
          console.error(`错误: ${e.message}`);
        });
    };
    step();
};

console.log('拉取线上config.json...');
http.get(urlConfigJSON, (res) => {
  const { statusCode } = res;

  let error;
  if (statusCode !== 200) {
    error = new Error('请求失败。\n' +
                      `状态码: ${statusCode}`);
  }
  if (error) {
    console.error(error.message);
    // 消耗响应数据以释放内存
    res.resume();
    return;
  }

  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log('读取本地config.json');
      if (fs.existsSync(pathLocalConfig)) {
        fs.readFile(pathLocalConfig, 'utf8', (err, data) => {
          if (err) throw err;
          fnSync(parsedData, JSON.parse(data));
        });
      } else {
        fnSync(parsedData, {});
      }
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  console.error(`错误: ${e.message}`);
});