import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRecords } from './RecordsContext';
import { BrandLogo } from './BrandLogo';

const MIN_VISIBLE_MS = 600;
const MAX_VISIBLE_MS = 1100;
const MAX_TOTAL_MS = 1400;
const FADE_MS = 200;

let launchScreenShown = false;

export function LaunchScreen() {
  const { load } = useRecords();
  const [visible, setVisible] = useState(
    () => !launchScreenShown && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  const leavingRef = useRef(false);
  const startedAt = useRef(0);
  const fadeTimer = useRef<number | undefined>(undefined);
  const ready = useRef(load.status !== 'loading');
  ready.current = load.status !== 'loading';

  const beginFade = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    fadeTimer.current = window.setTimeout(() => setVisible(false), FADE_MS);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    if (!started.current) {
      if (launchScreenShown) {
        setVisible(false);
        return;
      }

      started.current = true;
      launchScreenShown = true;
      startedAt.current = performance.now();
    }

    const elapsed = performance.now() - startedAt.current;
    const minTimer = window.setTimeout(() => {
      if (ready.current) beginFade();
    }, Math.max(0, MIN_VISIBLE_MS - elapsed));
    const maxTimer = window.setTimeout(beginFade, Math.max(0, MAX_VISIBLE_MS - elapsed));
    const forceRemoveTimer = window.setTimeout(
      () => setVisible(false),
      Math.max(0, MAX_TOTAL_MS - elapsed),
    );

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(forceRemoveTimer);
      if (fadeTimer.current !== undefined) window.clearTimeout(fadeTimer.current);
    };
  }, [beginFade, visible]);

  useEffect(() => {
    if (!visible || load.status === 'loading' || !started.current) return;
    const delay = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
    const timer = window.setTimeout(beginFade, delay);
    return () => window.clearTimeout(timer);
  }, [beginFade, load.status, visible]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const removeForReducedMotion = () => {
      if (preference.matches) setVisible(false);
    };
    preference.addEventListener('change', removeForReducedMotion);
    return () => preference.removeEventListener('change', removeForReducedMotion);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`launch-screen${leaving ? ' launch-screen-leaving' : ''}`}
      data-testid="launch-screen"
      aria-hidden="true"
      onPointerDown={() => setVisible(false)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="launch-screen-content">
        <BrandLogo size="large" decorative />
        <span className="launch-screen-title">爱车记录</span>
      </div>
    </div>
  );
}
