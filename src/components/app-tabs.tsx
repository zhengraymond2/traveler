import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export default function AppTabs() {
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

      <NativeTabs.Trigger name="countries">
        <NativeTabs.Trigger.Label>Countries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="go">
        <NativeTabs.Trigger.Label hidden>Go!</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={<GoTabIcon />} renderingMode="original" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="collections">
        <NativeTabs.Trigger.Label>Collections</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="airplane.departure" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function GoTabIcon() {
  return (
    <View style={styles.goIcon}>
      <Text style={styles.goIconText}>Go!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: AppColors.primary,
    boxShadow: `0 8px 18px ${AppColors.navShadow}`,
  },
  goIconText: {
    color: AppColors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
});
