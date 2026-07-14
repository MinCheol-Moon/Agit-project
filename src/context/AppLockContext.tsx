import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isPinSet, setPin as savePin, verifyPin } from '../lib/pin';

interface AppLockContextValue {
  ready: boolean;
  hasPin: boolean;
  unlocked: boolean;
  unlock: (pin: string) => Promise<boolean>;
  createPin: (pin: string) => Promise<void>;
  lock: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    isPinSet().then((result) => {
      setHasPin(result);
      setReady(true);
    });
  }, []);

  const value = useMemo<AppLockContextValue>(
    () => ({
      ready,
      hasPin,
      unlocked,
      unlock: async (pin: string) => {
        const ok = await verifyPin(pin);
        if (ok) setUnlocked(true);
        return ok;
      },
      createPin: async (pin: string) => {
        await savePin(pin);
        setHasPin(true);
        setUnlocked(true);
      },
      lock: () => setUnlocked(false),
    }),
    [ready, hasPin, unlocked],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
