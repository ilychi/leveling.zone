import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');

// 确保历史记录文件存在
async function ensureHistoryFile() {
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, '[]', 'utf-8');
  }
}

// 读取历史记录
async function readHistory() {
  await ensureHistoryFile();
  const data = await fs.readFile(HISTORY_FILE, 'utf-8');
  return JSON.parse(data);
}

// 写入历史记录
async function writeHistory(history: any[]) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const ip = searchParams.get('ip');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let history = await readHistory();

    // 应用过滤条件
    if (ip) {
      history = history.filter((item: any) => item.ip === ip);
    }
    if (startDate || endDate) {
      history = history.filter((item: any) => {
        const timestamp = new Date(item.timestamp).getTime();
        if (startDate && timestamp < new Date(startDate).getTime()) return false;
        if (endDate && timestamp > new Date(endDate).getTime()) return false;
        return true;
      });
    }

    // 按时间倒序排序并限制数量
    history = history
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取历史记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const history = await readHistory();

    // 添加新记录
    history.push({
      ...data,
      timestamp: new Date().toISOString(),
    });

    // 只保留最近的1000条记录
    const limitedHistory = history
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 1000);

    await writeHistory(limitedHistory);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存历史记录失败' },
      { status: 500 }
    );
  }
}
