var fs = require('fs');
stat = fs.stat;

/**
* 本人不会ES6，所以还是传统语法
* 1. 基于每月文件夹中的具体每日HTML页面创建集合的index.html
* 2. 根据月份文件夹和文章文件夹创建JSON文件，左侧导航生成需要
     至于文章菜单显示的文字，取自.html页面的文件名
*/

module.exports = (function () {
	return {
		// 纯数字年月转换成中文
		// 如：201702 → 2017年2月
		yearMonthConvert: function (yearMonth) {
			var year = yearMonth.slice(0, 4),
			month = yearMonth.replace(year, '');

			return year + '年' + parseInt(month, 10) + '月';
		},
		// 左侧菜单JSON数据生成
		// 数据格式示意
		/**
			{
				daily: [{
					menu: '2017年2月',
					url: './201702/'
				}, {
					menu: '2017年3月',
					url: './201703/'
				}],
				article: [{
					menu: '青云餐馆聚餐',
					url: './article/青云餐馆聚餐.html'
				}]
			}
		*/
		createMenuJSON: function (files) {
			var self = this;

			var filenameJSON = 'menu.json';

			var json = {
				daily: [],
				article: []
			};

			var create = function () {
				fs.writeFile(filenameJSON, JSON.stringify(json), function () {
					console.log(filenameJSON + ': 生成成功！');
				});
			};


			var isLoopFinished = false;

			files.forEach(function (folderName) {
				if (folderName === 'article') {
					// 文章以.html的文件名作为信息内容
					// 文章文件名需要以日期开头，以保证顺序
					fs.readdir('./article', function (err, files) {
					    if (err) {
					        throw err;
					    }
					    files.forEach(function(filename) {
					    	var menu = filename.split('.')[0];
					    	if (menu.split('_').length > 1) {
					    		menu = menu.split('_')[1];
					    	}
					    	json.article.unshift({
								menu: menu,
								url: './article/' + filename
							});
					    });

					    if (isLoopFinished === true) {
					    	create();
					    }
					});
				} else if (/^\d{6}$/.test(folderName)) {
					// 月份直接
					json.daily.unshift({
						menu: self.yearMonthConvert(folderName),
						url: './'+ folderName +'/?r=' + new Date().getTime()
					});
				}
			});

			isLoopFinished = true;
		},

		fileDaliyCombo: function (folderName) {
			var self = this;
			// 年月
			var yearMonth = self.yearMonthConvert(folderName);
			// 所有.html文件合成index.html
			var html = '<!DOCTYPE html>\
<html>\
<head>\
	<meta charset="utf-8">\
	<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">\
	<title>'+ yearMonth +'学院日常</title>\
</head>\
<body>$1</body>\
</html>';

			var htmlBody = '<h1>'+ yearMonth +'学院日常</h1>';
			// 主体内容
			fs.readdir(folderName, function (err, files) {
			    if (err) {
			        throw err;
			    }
			    var arrDay = [], objHTML = {};

			    // 遍历所有的文件，这里应该都是.html文件
			    files.forEach(function(filename) {
			    	var day = filename.split('.')[0];
			    	if (/^\d+\.html$/.test(filename)) {
			    		// 记住文件名日期值
			    		arrDay.push(day);
			    		// 读取对应日期日常内容
			    		var data = fs.readFileSync(folderName + '/' + filename, 'utf8');

			    		// 取<body>标签里面内容
					    var htmlDayBody = data.replace(/[\w\W]*<body>([\w\W]*)<\/body>[\w\W]*/i, '$1');

					    // 图片lazyLoad
					    htmlDayBody = htmlDayBody.replace(/\ssrc/g, ' data-src');

					    // 主动增加标题
					    htmlDayBody = '<h3 id="'+ folderName + day +'">'+ yearMonth + day + '日</h3>' + htmlDayBody;
					    objHTML[day] = htmlDayBody;
			    	}
			    });
			    // 数组排序，倒叙，最近的日期在上面
		    	var arrDayDesc = arrDay.sort(function (a, b) {
		    		return b - a;
		    	});

		    	// 根据数组创建索引
		    	var htmlIndex = '<h3>索引</h3><ul>';
		    	arrDayDesc.forEach(function (day) {
		    		htmlIndex = htmlIndex + '<li><a href="#'+ folderName + day +'">'+ yearMonth + day + '日</a></li>';
		    	});
		    	htmlIndex += '</ul>';

		    	// 每日日常HTML内容
		    	var htmlDaliy = '';
		    	arrDayDesc.forEach(function (day) {
		    		htmlDaliy += objHTML[day];
		    	});

		    	// 最后大整合
			    html = html.replace('$1', htmlBody + htmlIndex + htmlDaliy);

			    // 写入新的index.html
			    var path = folderName + '/index.html';
			    fs.writeFile(path, html, function () {
					console.log(path + ': 生成成功！');
				});
			});
		},

		/* 遍历文件夹，生成索引菜单JSON数据 */
		readFile: function () {
			var self = this;

			fs.readdir('./', function (err, files) {
			    if (err) {
			        throw err;
			    }

			    // index.html页面左侧菜单数据生成
			    self.createMenuJSON(files);

			    // 每月日常内容的合并
			    files.forEach(function(filename) {
			    	if (/^\d{6}$/.test(filename)) {
			    		self.fileDaliyCombo(filename);
			    	}
			    });
			});
		},
		init: function () {
			this.readFile();
		}
	}
})();