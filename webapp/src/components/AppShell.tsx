import type { ReactNode } from 'react';
import { useTheme } from './ThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <div className="min-h-screen bg-page">
      <nav className="sticky top-0 z-10 border-b border-edge bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold text-heading">PFS</span>
          <button
            onClick={cycleTheme}
            className="min-h-[44px] min-w-[44px] rounded-lg px-3 text-sm text-muted hover:bg-hover hover:text-heading"
            aria-label={`Theme: ${theme}`}
          >
            {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
