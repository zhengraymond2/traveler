import * as React from 'react';
import { Keyboard, StyleSheet, TextInput as NativeTextInput, View } from 'react-native';
import { Dropdown, type IDropdownRef } from 'react-native-element-dropdown';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';
import {
  buildCountryRegionOptions,
  getMatchingCountryRegion,
  getMostRecentRegion,
  hasCountryRegionMatch,
  type CountryRegionOption,
} from '@/data/country-region-options';
import type { Location } from '@/db/schema';

type CountryRegionDropdownProps = {
  savedRegions: Location[];
  value: string;
  onChange: (country: string) => void;
};

export function CountryRegionDropdown({ savedRegions, value, onChange }: CountryRegionDropdownProps) {
  const [searchText, setSearchText] = React.useState('');
  const dropdownRef = React.useRef<IDropdownRef>(null);
  const searchInputRef = React.useRef<React.ElementRef<typeof NativeTextInput>>(null);
  const recentRegion = React.useMemo(() => getMostRecentRegion(savedRegions), [savedRegions]);
  const baseOptions = React.useMemo(
    () => buildCountryRegionOptions({ recentRegion, savedRegions, searchText: '', selectedRegion: value }),
    [recentRegion, savedRegions, value]
  );
  const options = React.useMemo(
    () => buildCountryRegionOptions({ recentRegion, savedRegions, searchText, selectedRegion: value }),
    [recentRegion, savedRegions, searchText, value]
  );
  const topMatchingValue = React.useMemo(() => getTopMatchingValue(options, searchText), [options, searchText]);

  function handleSearchTextChange(text: string) {
    const normalizedText = text.trim();
    const exactCountryMatch = getMatchingCountryRegion(normalizedText);

    setSearchText(text);

    if (!normalizedText) {
      return;
    }

    if (exactCountryMatch) {
      onChange(exactCountryMatch.value);
      return;
    }

    if (!hasCountryRegionMatch(baseOptions, normalizedText)) {
      onChange(normalizedText);
    }
  }

  function handleSelectCountryRegion(option: CountryRegionOption) {
    setSearchText(option.value);
    onChange(option.value);
  }

  function handleDropdownFocus() {
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }

  function handleSubmitSearchText() {
    const normalizedSearch = normalizeSearchText(searchText);
    const selectedOption = normalizedSearch
      ? options.find((option) => normalizeSearchText(option.label).includes(normalizedSearch))
      : undefined;
    const submittedValue = selectedOption?.value ?? searchText.trim();

    if (submittedValue) {
      setSearchText(submittedValue);
      onChange(submittedValue);
    }

    dropdownRef.current?.close();
    Keyboard.dismiss();
  }

  return (
    <View style={styles.field}>
      <Text selectable variant="labelLarge" style={styles.label}>
        Country or region
      </Text>
      <Dropdown
        ref={dropdownRef}
        accessibilityLabel="Country or region"
        testID="country-region-dropdown"
        activeColor={AppColors.surfacePressed}
        autoScroll={false}
        containerStyle={styles.menu}
        data={options}
        dropdownPosition="auto"
        flatListProps={{ keyboardShouldPersistTaps: 'handled' }}
        inputSearchStyle={styles.searchInput}
        itemContainerStyle={styles.itemContainer}
        itemTextStyle={styles.itemText}
        keyboardAvoiding
        labelField="label"
        maxHeight={360}
        mode="default"
        onChange={handleSelectCountryRegion}
        onChangeText={handleSearchTextChange}
        onFocus={handleDropdownFocus}
        placeholder="Japan, Portugal, Mexico City..."
        placeholderStyle={styles.placeholderText}
        renderInputSearch={(onSearch) => (
          <NativeTextInput
            ref={searchInputRef}
            testID="country-region-search-input"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            placeholder="Search or type a custom region"
            placeholderTextColor={AppColors.textTertiary}
            returnKeyType="done"
            style={styles.searchInput}
            submitBehavior="blurAndSubmit"
            value={searchText}
            onChangeText={onSearch}
            onSubmitEditing={handleSubmitSearchText}
          />
        )}
        renderItem={(item) => renderCountryRegionItem(item, item.value === topMatchingValue)}
        search
        searchField="label"
        searchPlaceholder="Search or type a custom region"
        searchPlaceholderTextColor={AppColors.textTertiary}
        selectedTextStyle={styles.selectedText}
        style={styles.dropdown}
        value={value}
        valueField="value"
      />
    </View>
  );
}

function renderCountryRegionItem(item: CountryRegionOption, isTopMatch: boolean) {
  return (
    <View>
      <View style={[styles.row, isTopMatch && styles.topMatchRow]}>
        <View style={styles.rowText}>
          <Text selectable={false} variant="bodyLarge" numberOfLines={1} style={styles.rowLabel}>
            {item.label}
          </Text>
          {item.detail ? (
            <Text selectable={false} variant="bodySmall" numberOfLines={1} style={styles.rowDetail}>
              {item.detail}
            </Text>
          ) : null}
        </View>
        {item.isRecent ? (
          <Text selectable={false} variant="labelSmall" style={styles.recentText}>
            recent
          </Text>
        ) : null}
      </View>
      {item.isRecent ? <View style={styles.recentDivider} /> : null}
    </View>
  );
}

function getTopMatchingValue(options: CountryRegionOption[], searchText: string) {
  const normalizedSearch = normalizeSearchText(searchText);
  if (!normalizedSearch) {
    return undefined;
  }

  return options.find((option) => normalizeSearchText(option.label).includes(normalizedSearch))?.value;
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\s/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    color: AppColors.text,
  },
  dropdown: {
    height: 56,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: AppColors.outline,
    paddingHorizontal: 14,
    backgroundColor: AppColors.surface,
  },
  menu: {
    overflow: 'hidden',
    borderRadius: 8,
    borderColor: AppColors.surfaceVariant,
    backgroundColor: AppColors.surface,
  },
  placeholderText: {
    color: AppColors.textMuted,
    fontSize: 16,
  },
  selectedText: {
    color: AppColors.text,
    fontSize: 16,
  },
  itemContainer: {
    backgroundColor: AppColors.surface,
  },
  itemText: {
    color: AppColors.text,
  },
  searchInput: {
    height: 46,
    paddingHorizontal: 14,
    color: AppColors.text,
    fontSize: 16,
    backgroundColor: AppColors.surface,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topMatchRow: {
    backgroundColor: AppColors.surfaceMuted,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: AppColors.text,
  },
  rowDetail: {
    color: AppColors.textMuted,
  },
  recentText: {
    color: AppColors.textTertiary,
  },
  recentDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
    backgroundColor: AppColors.surfaceVariant,
  },
});
