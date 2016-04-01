/**
 * autor：gxl
 * blog：http://blog.csdn.net/gengxuelei
 * 热加载，本地服务器，文件监听，动态刷新
 * 处理图片（优化图片，压缩）
 * 处理scss（压缩合并，兼容前缀，base64，md5，sourcesmaps，雪碧图，px2rem高清方案）
 * webpack处理js（模块化开发，压缩合并混淆，sourcesmaps）
 * html动态更新img，css，js引用的md5码
 * 更改了gulp-md5-plus源码支持v?=1234（10位）的语法，避免文件冗余（见博客）
 *
 */

var gulp = require('gulp'),
  os = require('os'),
  path = require('path'),
  connect = require('gulp-connect'), //- 创建服务器
  watch = require('gulp-watch'), //监听文件变化
  px2rem = require('gulp-px3rem'), //- px转换rem
  sass = require('gulp-sass'), //- sass处理
  autoprefixer = require('gulp-autoprefixer'), //- 添加兼容前缀
  cssnano = require('gulp-cssnano'), //-压缩css
  sourcemaps = require('gulp-sourcemaps'), //-添加map文件
  md5 = require("gulp-md5-plus"), //md5去缓存（修改了源码）
  uglify = require('gulp-uglify'), //js压缩混淆
  gulpOpen = require('gulp-open'), //用指定软件打开文件
  concat = require('gulp-concat'), //文件合并all-in-one
  base64 = require('gulp-base64'), //把后缀#base64且小于32k的图片转换成base64
  uncss = require('gulp-uncss'), //根据html和引用的css删除冗余css样式
  webpack = require('webpack'),  //webpack模块化打包js
  spritesmith = require('gulp.spritesmith'); //雪碧图

var _html = 'html/index.html', //需要处理的html文件
  _scssArr = ['src/page/a/scss/*.scss', 'src/lib/scss/*.scss'], //需要处理的scss数组
  _jsArr = ['src/page/a/js/*.js', 'src/lib/js/*.js'], //需要处理的js数组
  _imgArr = [], //需要处理的img数组

  _cssDistDir = 'dist/css/a/', //发布的css目录
  _cssMapsDir = 'dist/maps/a/', // 发布的cssMaps目录
  _cssDistName = 'a.min.css', //发布的css名称

  _jsDistDir = 'dist/js/a/', //发布的js目录
  _jsMapsDir = 'dist/maps/a/', // 发布的jsMaps目录
  _jsDistName = 'a.min.js'; //发布到js名称

var browser = os.platform() === 'linux' ? 'google-chrome' : (
  os.platform() === 'darwin' ? 'google chrome' : (
    os.platform() === 'win32' ? 'chrome' : 'firefox'));

// 启动服务器，端口8878，开启自动刷新，打开chrome浏览器
gulp.task('web', function() {
  connect.server({
    port: 8878,
    livereload: true
  });
  gulp.src(__filename)
    .pipe(gulpOpen({
      uri: 'http://localhost:8878',
      app: browser
    }));
});

// 刷新浏览器
gulp.task('reload', function() {
  gulp.src([_html, _jsDistDir + _jsDistName, _cssDistDir + _cssDistName])
    .pipe(connect.reload());
});

// css雪碧图，生成的雪碧图和对应的css，需手动替换
gulp.task('sprite', function() {
  var spriteData = gulp.src(_imgArr)
    .pipe(spritesmith({
      imgName: 'sprite.png',
      cssName: 'sprite.css'
    }));
  return spriteData.pipe(gulp.dest('dist/sprite/'));
});

//scss预处理（合并，解析，兼容前缀，压缩，sourcemaps）
gulp.task('scssTask', function() {
  gulp.src(_scssArr) //- 需要处理的scss文件，放到一个数组里
    .pipe(sourcemaps.init())
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(concat(_cssDistName)) //合并scss
    .pipe(autoprefixer()) //- 添加兼容性前缀
    // .pipe(px2rem())
    // .pipe(base64({extensions: [/\.(jpg|png)#base64/i]}))  //后缀为#base64的小于32k的图片会被转为base64
    // .pipe(cssnano()) //-压缩css
    .pipe(sourcemaps.write(path.relative(_cssDistDir, _cssMapsDir), {
      sourceMappingURL: function(file) {
        return '/' + _cssMapsDir + file.relative + '.map';
      }
    })) //- maps另存
    .pipe(gulp.dest(_cssDistDir)) //- 处理得到的css文件发布到对应目录
    .pipe(md5(10, _html)); //处理html引用加入md5去缓存
});

//js预处理（合并，压缩混淆，sourcemaps）
gulp.task('jsTask', function() {
  gulp.src(_jsArr) //- 需要处理的js文件，放到一个字符串里
    .pipe(sourcemaps.init()) //- map初始化
    .pipe(concat(_jsDistName)) //合并js
    .pipe(uglify()) //-压缩混淆js
    .pipe(sourcemaps.write(path.relative(_jsDistDir, _jsMapsDir), {
      sourceMappingURL: function(file) {
        return '/' + _jsMapsDir + file.relative + '.map';
      }
    })) //- maps另存
    .pipe(gulp.dest(_jsDistDir)) //- 处理得到的js文件发布到对应目录
    .pipe(md5(10, _html)); //处理html引用加入md5去缓存
});

// webpack打包js
gulp.task('webpack', function() {
  webpack({
    entry: "./src/page/a/js/script.js",
    output: {
      path: './dist/js/a/',
      filename: "a.bundle.js"
    },
    module: {
      loaders: [{
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }]
    },
    resolve: {
      extensions: ['', '.js', '.json']
    }
  }, function(err, stats) {
    if(err) console.log(err);
  });

});

gulp.task('webpackTask', ['webpack'], function() {
  gulp.src('./dist/js/a/a.bundle.js')
    .pipe(md5(10, _html)); //处理html引用加入md5去缓存
});

//监听文件变化，处理scss，刷新浏览器
gulp.task('watch', function() {
  gulp.watch(_html, ['reload']); //html变化刷新浏览器
  gulp.watch(_scssArr, ['scssTask', 'reload']); //scss变化，处理scss，刷新浏览器
  gulp.watch(_jsArr, ['jsTask', 'reload']); //js变化，处理js，刷新浏览器
});

//设置默认任务
gulp.task('default', ['web']);

//开发任务
gulp.task('dev', ['scssTask', 'jsTask', 'web', 'watch']);

//发布任务
gulp.task('pub', ['web']);
