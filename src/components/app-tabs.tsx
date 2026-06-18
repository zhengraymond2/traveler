import { NativeTabs } from 'expo-router/unstable-native-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { useAuth } from '@/auth';
import { AppColors } from '@/constants/theme';

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function AppTabs() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const profileIconName = isSignedIn && user ? getInitialCircleIconName(user.initials) : 'account-circle-outline';

  return (
    <NativeTabs
      backgroundColor={AppColors.navBackground}
      blurEffect="systemUltraThinMaterialLight"
      indicatorColor={AppColors.primaryContainer}
      labelStyle={{ selected: { color: AppColors.onPrimaryContainer } }}
      shadowColor={AppColors.navShadow}
      tintColor={AppColors.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name={profileIconName}
            />
          }
        />
        {isSignedIn && user ? <NativeTabs.Trigger.Badge>{user.initials}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function getInitialCircleIconName(initials: string) {
  const fallbackIcon = 'account-circle';
  const visibleInitial = initials.trim().at(-1)?.toLocaleLowerCase();

  if (!isInitialIconKey(visibleInitial)) {
    return fallbackIcon;
  }

  return initialCircleIcons[visibleInitial];
}

const initialCircleIcons = {
  a: 'alpha-a-circle',
  b: 'alpha-b-circle',
  c: 'alpha-c-circle',
  d: 'alpha-d-circle',
  e: 'alpha-e-circle',
  f: 'alpha-f-circle',
  g: 'alpha-g-circle',
  h: 'alpha-h-circle',
  i: 'alpha-i-circle',
  j: 'alpha-j-circle',
  k: 'alpha-k-circle',
  l: 'alpha-l-circle',
  m: 'alpha-m-circle',
  n: 'alpha-n-circle',
  o: 'alpha-o-circle',
  p: 'alpha-p-circle',
  q: 'alpha-q-circle',
  r: 'alpha-r-circle',
  s: 'alpha-s-circle',
  t: 'alpha-t-circle',
  u: 'alpha-u-circle',
  v: 'alpha-v-circle',
  w: 'alpha-w-circle',
  x: 'alpha-x-circle',
  y: 'alpha-y-circle',
  z: 'alpha-z-circle',
} satisfies Record<string, MaterialCommunityIconName>;

function isInitialIconKey(value: string | undefined): value is keyof typeof initialCircleIcons {
  return Boolean(value && value in initialCircleIcons);
}
