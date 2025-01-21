import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IP 位置查询 | HTML.ZONE',
  description: '免费的 IP 地理位置查询服务',
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
