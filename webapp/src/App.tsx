import { ThemeProvider } from './components/ThemeProvider';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { DataStoreProvider } from './store';

export function App() {
  return (
    <DataStoreProvider>
      <ThemeProvider>
        <AppShell>
          <HomePage />
        </AppShell>
      </ThemeProvider>
    </DataStoreProvider>
  );
}
