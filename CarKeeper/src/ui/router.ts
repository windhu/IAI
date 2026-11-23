import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new-maintenance' }
  | { name: 'new-fuel' }
  | { name: 'history' }
  | { name: 'record'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'backup' }
  | { name: 'not-found' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return { name: 'home' };
  if (path === '/maintenance/new') return { name: 'new-maintenance' };
  if (path === '/fuel/new') return { name: 'new-fuel' };
  if (path === '/history') return { name: 'history' };
  if (path === '/backup') return { name: 'backup' };
  const record = /^\/records\/([^/]+)(\/edit)?$/.exec(path);
  if (record) {
    const id = decodeURIComponent(record[1]);
    return record[2] ? { name: 'edit', id } : { name: 'record', id };
  }
  return { name: 'not-found' };
}

export const href = (path: string) => `#${path}`;

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
