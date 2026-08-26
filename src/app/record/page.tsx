import type { Metadata } from 'next';

import { RecordPanel } from '@/components/record/RecordPanel';

export const metadata: Metadata = {
  title: '오늘의 쓰담 · 쓰담하개',
  description: '이 기기에만 저장되는 나의 쓰담 기록.',
};

export default function RecordPage() {
  return <RecordPanel />;
}
