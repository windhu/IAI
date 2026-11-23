import { useSyncExternalStore } from 'react';

export type OfflineState = 'checking' | 'installing' | 'ready' | 'failed' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  offline: OfflineState;
  offlineError?: string;
  updateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  standalone: boolean;
}

let state: PwaState = {
  offline: 'checking',
  updateAvailable: false,
  installPrompt: null,
  standalone: typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
};
const listeners = new Set<() => void>();
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/**
 * The precache is installed atomically: an active worker means every app asset was cached.
 * We additionally confirm the app shell is still present in case the browser evicted it.
 */
export async function checkOfflineReady(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    setState({ offline: 'unsupported' });
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!registration) return;
  if (!registration.active) {
    setState(
      registration.installing || registration.waiting
        ? { offline: 'installing' }
        : { offline: 'failed', offlineError: '离线资源缓存失败。' },
    );
    return;
  }
  const shell = await caches.match(new URL(`${import.meta.env.BASE_URL}index.html`, location.href).href, {
    ignoreSearch: true,
  });
  setState(shell ? { offline: 'ready', offlineError: undefined } : { offline: 'failed', offlineError: '离线资源缺失，请联网后重试。' });
}

function trackWorker(worker: ServiceWorker, registration: ServiceWorkerRegistration) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'redundant' && !registration.active) {
      setState({ offline: 'failed', offlineError: '离线资源缓存失败。联网时仍可正常使用，可稍后重试。' });
    } else {
      void checkOfflineReady();
    }
  });
}

let watchingController = false;

function watchRegistration(registration: ServiceWorkerRegistration) {
  // An install may have started in an earlier page, so its updatefound event is already gone.
  if (registration.installing) trackWorker(registration.installing, registration);
  if (registration.waiting && !registration.active) trackWorker(registration.waiting, registration);
  registration.addEventListener('updatefound', () => {
    if (!registration.active) setState({ offline: 'installing' });
    if (registration.installing) trackWorker(registration.installing, registration);
  });
  if (!watchingController) {
    watchingController = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => void checkOfflineReady());
  }
}

export async function registerPwa(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    setState({ offline: 'unsupported' });
    return;
  }
  try {
    const { registerSW } = await import('virtual:pwa-register');
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh: () => setState({ updateAvailable: true }),
      onOfflineReady: () => void checkOfflineReady(),
      onRegisteredSW: (_url, registration) => {
        if (registration) watchRegistration(registration);
        void checkOfflineReady();
      },
      onRegisterError: () =>
        setState({ offline: 'failed', offlineError: '离线功能注册失败。联网时仍可正常使用，可稍后重试。' }),
    });
  } catch {
    setState({ offline: 'failed', offlineError: '离线功能初始化失败。联网时仍可正常使用。' });
  }
}

export async function retryOfflineSetup(): Promise<void> {
  setState({ offline: 'checking', offlineError: undefined });
  const registration = await navigator.serviceWorker?.getRegistration(import.meta.env.BASE_URL);
  if (registration) {
    try {
      await registration.update();
    } catch {
      setState({ offline: 'failed', offlineError: '重试失败，请确认网络连接后再试。' });
      return;
    }
    await checkOfflineReady();
  } else {
    await registerPwa();
  }
}

/** Activates the waiting version and reloads; only called after the user chooses to update. */
export async function installUpdate(): Promise<void> {
  await applyUpdate?.(true);
}

export async function promptInstall(): Promise<void> {
  const prompt = state.installPrompt;
  if (!prompt) return;
  await prompt.prompt();
  await prompt.userChoice.catch(() => undefined);
  setState({ installPrompt: null });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setState({ installPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => setState({ installPrompt: null }));
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => setState({ standalone: e.matches }));
}
