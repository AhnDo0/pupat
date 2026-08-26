'use client';

import { useCallback, useEffect, useState } from 'react';

import { getPlatform } from '@/platform';

const DISMISS_KEY = 'pupat.install.dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptApi {
  /** 설치 카드를 띄워도 되는 상태인지 */
  canInstall: boolean;
  install: () => void;
  dismiss: () => void;
}

/**
 * "홈 화면에 추가" 카드 제어.
 *
 * 브라우저가 설치 가능하다고 알려줄 때만(beforeinstallprompt) 나타나고,
 * 한 번 닫으면 저장소에 기억해 다시 귀찮게 하지 않는다.
 * 이 훅이 없어도 앱은 그대로 동작한다 — PWA는 어디까지나 덧붙인 기능이다.
 */
export function useInstallPrompt(): InstallPromptApi {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(getPlatform().storage.get(DISMISS_KEY) === '1');

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt();
    void deferred.userChoice.finally(() => setDeferred(null));
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setDeferred(null);
    getPlatform().storage.set(DISMISS_KEY, '1');
  }, []);

  return { canInstall: Boolean(deferred) && !dismissed, install, dismiss };
}
