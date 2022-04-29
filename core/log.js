const path = require('path');
const fs = require('fs');
const moment = require('moment');

const MAX_LOG_LEN = 10;
/**
 * 获取build的分支名称
 * @returns 返回分支名称
 */
function getBranchName() {
  const { REACT_APP_ENV } = process.env;
  return REACT_APP_ENV;
}
/**
 * 创建单行日志
 */
function createLogLine() {
  const { USERNAME, USER, LOGNAME } = process.env;
  const logLine = {
    user: USERNAME || USER || LOGNAME, // 兼容不同平台
    time: moment(new Date()).format('YYYY年MM月DD日 HH:mm:ss'),
  };
  return logLine;
}
/**
 * 根据分支名称创建日志文件
 * @param {string} branchName 当前分支名称
 * @returns 返回日志文件
 */
function createLogs(branchName, options) {
  let localConfigs;
  const configsJSON = fs.readFileSync(`${options.localLogsPath}/configs.json`, 'utf-8');
  // 判断是否有日志
  if (configsJSON !== '{}') {
    localConfigs = JSON.parse(configsJSON);
    const branchLog = localConfigs.logs.filter((log) => log.branch === branchName);
    if (branchLog.length) {
      // 判断是否有当前分支记录
      localConfigs.logs.forEach((log) => {
        if (log.branch === branchName) {
          log.lines.push(createLogLine());
        }
      });
    } else {
      // 没有当前分支记录创建记录
      localConfigs.logs.push({
        branch: branchName,
        lines: [createLogLine()],
      });
    }
  } else {
    // 没有日志新建
    const { npm_package_name } = process.env;
    localConfigs = {
      project: npm_package_name,
      logs: [
        {
          branch: branchName,
          lines: [createLogLine()],
        },
      ],
    };
  }

  return localConfigs;
}
/**
 * 处理完日志长度的文件
 * @param {Object} files 日志文件
 */
function handleLogLen(files) {
  let logs;
  if (files?.logs.length) {
    logs = files.logs.map((file) => {
      const len = file.lines.length;
      if (len > MAX_LOG_LEN) {
        file.lines = file.lines.slice(len - MAX_LOG_LEN);
      }
      return file;
    });
    files.logs = logs;
  }
  return files;
}

/**
 * 写入文件
 * @param {string} files 日志文件
 */
function writerLogsFile(files,options) {
  return new Promise((resolve, reject) => {
    const writeFilePath = path.join(options.localLogsPath, '/configs.json');
    fs.writeFile(writeFilePath, JSON.stringify(files), 'utf-8', (err) => {
      if (!err) {
        resolve(true);
      } else {
        console.log(`logs-err, ${err}`);
        reject(false);
      }
    });
  });
}

/**
 * 线程
 */
const log = async (options) => {
  return new Promise((resolve, reject) => {
    try {
      const branchName = getBranchName();
      const newLogs = createLogs(branchName, options);
      const files = handleLogLen(newLogs);
      writerLogsFile(files,options);
      resolve('create-logs-success');
    } catch (e) {
      reject(`create-logs-err, ${e}`);
    }
  });
};

module.exports = log;