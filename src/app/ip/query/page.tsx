'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function QueryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ip = searchParams.get('ip');
    if (ip) {
      // 重定向到主页并保留 IP 参数
      router.replace(`/?ip=${ip}`);
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return null;
} 
