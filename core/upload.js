const client = require('scp2');
const colors = require('colors');
const fs = require('fs');
const logs = require('./log');
const node_ssh = require('node-ssh');
const path = require('path');
const ssh = new node_ssh();
const open = require('open');

class Upload {
	constructor(opts = {}) {
		(this.options = {
			username: 'root',
			times: 0,
			nginxStatus: false,
			logsName: 'configs.json',
			buildName: 'build',
			reloadNg: 'nginx -s reload',
		}),
			(this.options = Object.assign(this.options, opts));
		
	}
	handleOpts() {
		const { packageName, reactAppEnv, localNginxPath } = this.options;
		this.options = Object.assign(this.options, {
			path: `/home/${packageName}/${reactAppEnv}`, // build上传到服务器的地址
			nginxFileName: `${packageName}-nginx.conf`, // 创建的nginx 文件的名称
			localLogsPath: `${localNginxPath}logs`,
			logsPath: `/home/${packageName}/logs`, // 日志地址
		});
		this.runing()
	}
	showLog() {
		const { packageName, reactAppEnv, BaseURL } = this.options;
		console.log(colors.green(`前端发版地址：`));
		console.log(colors.green(`${BaseURL}/${packageName}/${reactAppEnv}`));
		console.log(colors.green(`前端发版日志地址：`));
		console.log(colors.green(`${BaseURL}/${packageName}/logs`));
		open(`${BaseURL}/${packageName}/logs`);
	}
	/**
	 * 执行进程
	 */
	async runing() {
		try {
			// 下载日志文件
			await this.downloadLogs();
			// 上传build文件包
			await this.uploadBuild();
			// 获取nginx配置
			await this.getNginxConfig();
			// 创建nginx配置
			await this.createNewNginx();
			// 上传nginx配置
			await this.uploadNgFile();
			// 创建日志
			await logs(this.options);
			// 上传日志
			await this.uploadLogs();
			// 重启nginx
			if (this.options.nginxStatus) {
				this.handleNginx();
			}
			// 打印上传信息
			await this.showLog();
		} catch (err) {
			console.log(err);
		}
	}
	/**
	 * 重启nginx
	 */
	handleNginx() {
		const { host, password, tryKeyboard, port, reloadNg, username } = this.options;
		ssh
			.connect({
				host,
				password,
				username,
				tryKeyboard,
				port,
			})
			.then(() => {
				ssh
					.execCommand(reloadNg)
					.then(() => {
						process.exit();
					})
					.catch((err) => {
						throw `nginx-reload-err,${err}`;
					});
			});
	}
	/**
	 * 上传nginx文件
	 * @returns promise
	 */
	uploadNgFile() {
		const { username, password, host, nginxFileName, extendNgPath } = this.options;
		return new Promise((resolve, reject) => {
			client.scp(
				`program/${nginxFileName}`,
				`${username}:${password}@${host}:${extendNgPath}/`,
				(err) => {
					if (!err) {
						resolve('nginx-upload-success');
					} else {
						reject(`nginx-upload-err, ${err}`);
					}
				},
			);
		});
	}
	/**
	 * 创建新的nginx文件
	 */
	createNewNginx() {
		const { localNginxPath, nginxFileName, nginxLocation } = this.options;
		return new Promise((resolve, reject) => {
			const filePath = path.join(localNginxPath, nginxFileName);
			fs.readFile(filePath, 'utf-8', (err, fileData) => {
				if (err) {
					console.error(err);
					reject('createNginx-err1');
				}
				if (!fileData) {
					reject('服务器nginx配置为空'); // 抛出错误
				}
				if (fileData.includes(nginxLocation)) {
					this.options.nginxStatus = false; // nginx 配置文件有没有变化
					resolve('create-nginx-success!');
				} else {
					const _Value = `
  location ${nginxLocation} {
    alias /home${nginxLocation}/;
    try_files $uri $uri/ ${nginxLocation}/index.html;
    index index.html;
    gzip on;
  }
`;
					this.options.nginxStatus = true; // nginx 配置文件有变化
					const newDate = fileData.split(/\r\n|\n|\r/gm);
					newDate.splice(1, 0, _Value);
					fs.writeFileSync(filePath, newDate.join('\r\n'));
					resolve('create-nginx-success!');
				}
			});
		});
	}
	/**
	 * 获取server服务器的nginx配置文件
	 */
	getNginxConfig() {
		const { username, password, host, extendNgPath, nginxFileName, localNginxPath } = this.options;
		return new Promise((resolve, reject) => {
			client.scp(
				`${username}:${password}@${host}:${extendNgPath}/${nginxFileName}`,
				localNginxPath,
				(err) => {
					if (err) {
						reject(`downloadNginxConfigFile-err，${e}`);
					} else {
						resolve('downloadNginxConfigFile-success');
					}
				},
			);
		});
	}
	/**
	 * 重服务器下载日志的配置文件
	 */
	downloadLogs() {
		const { username, password, host, logsPath, logsName, localNginxPath } = this.options;
		try {
			return new Promise((resolve, reject) => {
				client.scp(
					`${username}:${password}@${host}:${logsPath}/${logsName}`,
					`${localNginxPath}logs/`,
					(err) => {
						if (err) console.log(err);
						resolve(true);
					},
				);
			});
		} catch (e) {
			throw `downloadLogsConfig-err，${e}`;
		}
	}
	/**
	 * 上传日志
	 */
	uploadLogs() {
		const { username, password, host, logsPath } = this.options;
		return new Promise((resolve, reject) => {
			client.scp('program/logs', `${username}:${password}@${host}:${logsPath}/`, (err) => {
				if (!err) {
					resolve('logs-upload-success');
				} else {
					reject(`logs-upload-err, ${err}`);
				}
			});
		});
	}

	/**
	 * 上传build文件
	 */
	uploadBuild() {
		const { buildName, username, password, path, host } = this.options;
		return new Promise((resolve, reject) => {
			client.scp(buildName, `${username}:${password}@${host}:${path}/`, (err) => {
				if (!err) {
					resolve('upload-build-success');
				} else {
					reject(colors.red(`build文件上传失败${err}`));
				}
			});
		});
	}
}

module.exports = Upload;