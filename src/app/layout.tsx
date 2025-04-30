import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEVELING.ZONE | IP位置查询',
  description: 'IP位置查询工具，提供免费查询IP地址位置信息，支持多个数据源，准确率高。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
