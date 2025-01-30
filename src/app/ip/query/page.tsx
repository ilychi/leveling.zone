import { redirect } from 'next/navigation';

export default function QueryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const ip = searchParams.ip;
  
  if (ip) {
    redirect(`/?ip=${ip}`);
  } else {
    redirect('/');
  }
} 
