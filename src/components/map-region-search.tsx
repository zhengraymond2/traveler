import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as React from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { MapControlLayout } from '@/constants/map';
import { AppColors } from '@/constants/theme';
import {
  filterMapRegionSearchOptions,
  type MapRegionSearchOption,
} from '@/data/map-region-search-options';

type MapRegionSearchProps = {
  onSelect: (option: MapRegionSearchOption) => void;
  options: MapRegionSearchOption[];
};

export function MapRegionSearch({ onSelect, options }: MapRegionSearchProps) {
  const { width } = useWindowDimensions();
  const inputRef = React.useRef<TextInput>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const filteredOptions = React.useMemo(
    () => filterMapRegionSearchOptions(options, query).slice(0, 8),
    [options, query]
  );
  const selectedOption = filteredOptions[0];
  const panelWidth = Math.round(width * 0.9);

  React.useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => clearTimeout(focusTimer);
  }, [isExpanded]);

  function handleOpen() {
    setIsExpanded(true);
  }

  function handleClose() {
    setIsExpanded(false);
    setQuery('');
    Keyboard.dismiss();
  }

  function handleSelect(option: MapRegionSearchOption | undefined) {
    if (!option) {
      return;
    }

    onSelect(option);
    handleClose();
  }

  if (!isExpanded) {
    return (
      <Animated.View
        entering={ZoomIn.duration(140)}
        exiting={ZoomOut.duration(110)}
        layout={LinearTransition.springify()}
        style={styles.collapsedContainer}>
        <Pressable
          accessibilityLabel="Search saved countries, regions, and locations"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [styles.searchButton, { opacity: pressed ? 0.82 : 1 }]}
          onPress={handleOpen}>
          <MaterialCommunityIcons name="magnify" size={24} color={AppColors.mapUserLocation} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={ZoomIn.duration(180)}
      exiting={ZoomOut.duration(120)}
      layout={LinearTransition.springify()}
      style={[styles.expandedPanel, { left: (width - panelWidth) / 2, width: panelWidth }]}>
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="magnify" size={22} color={AppColors.textMuted} />
        <TextInput
          ref={inputRef}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Search countries, regions, or locations"
          placeholderTextColor={AppColors.textTertiary}
          returnKeyType="search"
          style={styles.input}
          submitBehavior="submit"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSelect(selectedOption)}
        />
        <Pressable accessibilityLabel="Close search" accessibilityRole="button" hitSlop={10} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={22} color={AppColors.textMuted} />
        </Pressable>
      </View>

      {filteredOptions.length ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(90)} style={styles.results}>
          {filteredOptions.map((option, index) => (
            <Pressable
              key={`${option.source}-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === 0 }}
              style={({ pressed }) => [
                styles.resultRow,
                index === 0 && styles.highlightedResult,
                pressed && styles.pressedResult,
              ]}
              onPress={() => handleSelect(option)}>
              <View style={styles.resultText}>
                <Text selectable={false} variant="bodyLarge" numberOfLines={1} style={styles.resultTitle}>
                  {option.label}
                </Text>
                {option.detail ? (
                  <Text selectable={false} variant="bodySmall" numberOfLines={1} style={styles.resultDetail}>
                    {option.detail}
                  </Text>
                ) : null}
              </View>
              {index === 0 ? (
                <Text selectable={false} variant="labelSmall" style={styles.selectedLabel}>
                  selected
                </Text>
              ) : null}
            </Pressable>
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(90)} style={styles.emptyResults}>
          <Text selectable={false} variant="bodyMedium" style={styles.resultDetail}>
            No saved places match
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collapsedContainer: {
    position: 'absolute',
    top: MapControlLayout.searchTop,
    right: MapControlLayout.right,
  },
  searchButton: {
    width: MapControlLayout.size,
    height: MapControlLayout.size,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MapControlLayout.size / 2,
    backgroundColor: AppColors.surface,
    boxShadow: `0 7px 18px ${AppColors.shadow}`,
  },
  expandedPanel: {
    position: 'absolute',
    top: MapControlLayout.searchTop,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: AppColors.surface,
    boxShadow: `0 14px 32px ${AppColors.shadow}`,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: AppColors.text,
    fontSize: 16,
  },
  results: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.surfaceVariant,
  },
  resultRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  highlightedResult: {
    backgroundColor: AppColors.surfaceMuted,
  },
  pressedResult: {
    backgroundColor: AppColors.surfacePressed,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: AppColors.text,
  },
  resultDetail: {
    color: AppColors.textMuted,
  },
  selectedLabel: {
    color: AppColors.textTertiary,
  },
  emptyResults: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.surfaceVariant,
    padding: 14,
  },
});
