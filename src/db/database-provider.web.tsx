import * as React from 'react';

import type { LocationRepository } from './repository';

const DatabaseContext = React.createContext<LocationRepository | null>(null);

export function DatabaseProvider({ children }: React.PropsWithChildren) {
  return <DatabaseContext.Provider value={null}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const value = React.use(DatabaseContext);

  if (!value) {
    throw new Error('Database access is only configured for native builds.');
  }

  return value;
}
