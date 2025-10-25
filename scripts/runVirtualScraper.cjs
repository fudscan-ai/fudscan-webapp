#!/usr/bin/env node

/**
 * Virtual Agents Scraper Runner for PM2
 * 用于在PM2中运行Python爬虫脚本的Node.js包装器
 */

const { spawn } = require('child_process');
const path = require('path');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// Python脚本路径
const pythonExecutable = path.join(projectRoot, 'venv', 'bin', 'python3.12');
const scraperScript = path.join(projectRoot, 'scrap', 'run_scraper.py');

console.log('🚀 启动 Virtual Agents Scraper...');
console.log(`📁 项目目录: ${projectRoot}`);
console.log(`🐍 Python: ${pythonExecutable}`);
console.log(`📄 脚本: ${scraperScript}`);

// 执行Python脚本
const pythonProcess = spawn(pythonExecutable, [scraperScript], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// 处理进程事件
pythonProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Virtual Agents Scraper 执行成功');
  } else {
    console.error(`❌ Virtual Agents Scraper 执行失败，退出码: ${code}`);
  }
  process.exit(code);
});

pythonProcess.on('error', (error) => {
  console.error('❌ 启动 Python 脚本失败:', error);
  process.exit(1);
});

// 处理进程信号
process.on('SIGINT', () => {
  console.log('⚠️  收到 SIGINT 信号，正在终止...');
  pythonProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('⚠️  收到 SIGTERM 信号，正在终止...');
  pythonProcess.kill('SIGTERM');
});
