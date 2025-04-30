// 清理空值的函数
export function cleanupObject(obj: any) {
  if (!obj) return;
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined || obj[key] === null || obj[key] === '-') {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      cleanupObject(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  });
} 
