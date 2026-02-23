import React, { createContext, useContext } from 'react';
import { useRouteStore } from '@/hooks/useRouteStore';

type RouteContextType = ReturnType<typeof useRouteStore>;

const RouteContext = createContext<RouteContextType | null>(null);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const store = useRouteStore();
  return <RouteContext.Provider value={store}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
}
