# webpack-upload-plugin

> plugin webpack4.x

## 使用说明

在 webpack 目录中配置

### 例：

```javascript
const Upload = require('webpack-upload-plugin')
const path = require('path');

const { REACT_APP_ENV, npm_package_name } = process.env;
const pathurl = path.resolve(__dirname);
const _nginxUrl = `/${npm_package_name}/${REACT_APP_ENV}`;
const _Value = `location ${_nginxUrl} {
    alias /home${_nginxUrl}/;
    try_files $uri $uri/ ${_nginxUrl}/index.html;
    index index.html;
    gzip on;
}`;
module.exports = {
  ...
  configureWebpack: {
    plugins: [
      new Upload({
        BaseURL: 'http: //www.abc.com', // 页面部署地址
        packageName: npm_package_name, // 项目名称
	      reactAppEnv: REACT_APP_ENV, // 环境
        upload: true, // 环境判断是否执行上传
	      host: '', // 服务器地址
	      password: '', // 服务器密码
	      extendNgPath: '', // 合并nginx目录的子
	      localNginxPath: `${pathurl}/`,
	      nginxValue: _Value, // nginx 配置文件
	      nginxLocation: _nginxUrl, /// nginx 服务器地址
      })
    ]
  }
}
```

### 注意

- logs 文件要配置在项目根目录
- 获取根文件地址要用 path.resolve
