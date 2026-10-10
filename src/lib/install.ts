import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  /** Browser offered an install prompt (Chrome/Edge/Android). */
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;

export const useInstallStore = create<InstallState>()((set) => ({
  canInstall: false,
  installed:
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true),
  install: async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    set({ canInstall: false, installed: outcome === 'accepted' });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    useInstallStore.setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => useInstallStore.setState({ installed: true, canInstall: false }));
}
