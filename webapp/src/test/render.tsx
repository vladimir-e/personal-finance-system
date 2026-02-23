import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { DataStore } from 'pfs-lib';
import { DataStoreProvider } from '../store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: DataStore;
}

function createWrapper(initialState?: DataStore) {
  return function AllProviders({ children }: { children: React.ReactNode }) {
    return (
      <DataStoreProvider initialState={initialState}>
        {children}
      </DataStoreProvider>
    );
  };
}

export function render(ui: ReactElement, options?: ExtendedRenderOptions) {
  const { initialState, ...renderOptions } = options ?? {};
  return rtlRender(ui, { wrapper: createWrapper(initialState), ...renderOptions });
}

export * from '@testing-library/react';
