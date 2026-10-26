import { useCallback, useEffect, useState } from 'react';

// The inline script in index.html has already put the saved or system theme on <html>. This hook reads
// it back, keeps it in sync, and remembers the choice only when the visitor actually flips the switch.
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('ree-theme', next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
  }, [theme]);

  return [theme, toggle];
}
