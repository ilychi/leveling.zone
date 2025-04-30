import cron from 'node-cron';
import { updateDatabases } from './update-db';

// 每天零点执行更新
cron.schedule('0 0 * * *', async () => {
  console.log('开始定时更新数据库...');
  try {
    await updateDatabases();
    console.log('定时更新数据库完成');
  } catch (error) {
    console.error('定时更新数据库失败:', error);
  }
});
