import { ThemeProvider } from './components/ThemeProvider';
import { AppShell } from './components/AppShell';
import { DataStoreProvider } from './store';

export function App() {
  return (
    <DataStoreProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </DataStoreProvider>
  );
}
