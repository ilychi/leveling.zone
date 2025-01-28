import * as fs from 'fs';
import * as path from 'path';
const IPDB = require('ipdb');
const qqwry_ipdb = require('qqwry.ipdb');

const DB_DIR = path.join(process.cwd(), 'data', 'db');

async function testQQWry() {
  try {
    // 读取数据库文件
    const buffer = fs.readFileSync(path.join(DB_DIR, 'qqwry.ipdb'));
    console.log('数据库文件大小:', buffer.length / 1024 / 1024, 'MB');

    // 初始化 IPDB
    const ipdb = new IPDB(buffer);

    // 测试几个不同的 IP
    const testIPs = [
      '114.114.114.114', // 114DNS
      '183.62.57.1', // 广东电信
      '202.106.0.20', // 北京联通
      '211.138.30.66', // 中国移动
    ];

    for (const ip of testIPs) {
      console.log(`\n测试 IP: ${ip}`);
      const result = ipdb.find(ip);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testQQWry();
