import { buildCountryRegionOptions, getMatchingCountryRegion } from '../country-region-options';

describe('country region options', () => {
  test('includes curated travel regions as first-class region options', () => {
    const options = buildCountryRegionOptions({ savedRegions: [], searchText: 'pnw' });

    expect(options[0]).toMatchObject({
      detail: 'Travel region',
      label: 'PNW',
      source: 'region',
      value: 'PNW',
    });
  });

  test('matches curated travel regions case-insensitively', () => {
    expect(getMatchingCountryRegion('canadian rockies')).toMatchObject({
      label: 'Canadian Rockies',
      source: 'region',
      value: 'Canadian Rockies',
    });
  });

  test('deduplicates saved custom regions case-insensitively', () => {
    const options = buildCountryRegionOptions({
      savedRegions: [
        { country: 'azores', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        { country: 'Azores', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      ],
      searchText: 'azores',
    });

    expect(options.filter((option) => option.value.toLocaleLowerCase() === 'azores')).toHaveLength(1);
  });
});
