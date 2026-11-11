import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'lrt.theme';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function load(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return systemTheme();
}

let theme: Theme = load();
const listeners = new Set<() => void>();

function apply(next: Theme) {
  theme = next;
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

apply(theme);

// Follow the OS if the user has never chosen explicitly.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  try {
    if (!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
});

export function useTheme(): [Theme, () => void] {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => theme,
    () => theme,
  );
  return [current, () => apply(current === 'dark' ? 'light' : 'dark')];
}
