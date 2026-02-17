import { ThemeProvider } from './components/ThemeProvider';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <HomePage />
      </AppShell>
    </ThemeProvider>
  );
}
