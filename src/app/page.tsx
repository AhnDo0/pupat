import { PetStage } from '@/components/dog/PetStage';

/**
 * 메인 화면 — Desktop / Tablet / Mobile / PWA가 모두 이 한 화면을 공유한다.
 * 모바일 전용 페이지는 만들지 않는다.
 */
export default function Home() {
  return <PetStage />;
}
