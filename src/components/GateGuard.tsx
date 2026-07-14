import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { can, PermissionKey } from '../lib/permissions';
import { PERMISSIONS } from '../lib/permissions';
import { TIER_RANK, Tier } from '../types';
import { LockedOverlay } from './LockedOverlay';

const RANK_TO_TIER: Record<number, Tier> = {
  0: 'guest',
  1: 'raljab',
  2: 'talbuchak',
  3: 'taljuninja',
  4: 'akatsuki',
};

export function GateGuard({
  permission,
  children,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  if (can(tier, permission)) return <>{children}</>;
  const requiredTier = RANK_TO_TIER[PERMISSIONS[permission]];
  return (
    <View style={{ position: 'relative' }}>
      <View pointerEvents="none" style={{ opacity: 0.3 }}>
        {children}
      </View>
      <LockedOverlay requiredTier={requiredTier} />
    </View>
  );
}
