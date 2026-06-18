import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useAuth } from '@/auth';
import { AppColors } from '@/constants/theme';

export default function AppTabs() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const profileIconName = isSignedIn && user ? getInitialCircleIconName(user.initials) : 'person.crop.circle';

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
        <NativeTabs.Trigger.Icon sf={profileIconName} />
        {isSignedIn && user ? <NativeTabs.Trigger.Badge>{user.initials}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function getInitialCircleIconName(initials: string) {
  const fallbackIcon = 'person.crop.circle.fill';
  const visibleInitial = initials.trim().at(-1)?.toLocaleLowerCase();

  if (!isInitialIconKey(visibleInitial)) {
    return fallbackIcon;
  }

  return initialCircleIcons[visibleInitial];
}

const initialCircleIcons = {
  a: 'a.circle.fill',
  b: 'b.circle.fill',
  c: 'c.circle.fill',
  d: 'd.circle.fill',
  e: 'e.circle.fill',
  f: 'f.circle.fill',
  g: 'g.circle.fill',
  h: 'h.circle.fill',
  i: 'i.circle.fill',
  j: 'j.circle.fill',
  k: 'k.circle.fill',
  l: 'l.circle.fill',
  m: 'm.circle.fill',
  n: 'n.circle.fill',
  o: 'o.circle.fill',
  p: 'p.circle.fill',
  q: 'q.circle.fill',
  r: 'r.circle.fill',
  s: 's.circle.fill',
  t: 't.circle.fill',
  u: 'u.circle.fill',
  v: 'v.circle.fill',
  w: 'w.circle.fill',
  x: 'x.circle.fill',
  y: 'y.circle.fill',
  z: 'z.circle.fill',
} satisfies Record<string, SFSymbol>;

function isInitialIconKey(value: string | undefined): value is keyof typeof initialCircleIcons {
  return Boolean(value && value in initialCircleIcons);
}
