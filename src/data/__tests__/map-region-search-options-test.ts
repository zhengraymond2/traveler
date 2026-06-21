import { MapTuning } from '@/constants/map';
import { DbTestHelper } from '@/test/DbTestHelper';

import { buildMapRegionSearchOptions, filterMapRegionSearchOptions } from '../map-region-search-options';

describe('map region search options', () => {
  test('includes saved locations as searchable map results with location zoom', () => {
    const options = buildMapRegionSearchOptions([
      DbTestHelper.locationWithPhotos({
        id: 'mont-saint-michel',
        name: 'Mont Saint Michel',
        country: 'France',
        latitude: 48.636,
        longitude: -1.5115,
      }),
    ]);

    expect(options).toContainEqual(
      expect.objectContaining({
        center: {
          latitude: 48.636,
          longitude: -1.5115,
        },
        detail: 'France · Saved location',
        label: 'Mont Saint Michel',
        source: 'location',
        value: 'mont-saint-michel',
        zoomLevel: MapTuning.countryViewZoomLevel + 1,
      })
    );
  });

  test('ranks saved location name matches ahead of region detail matches', () => {
    const options = buildMapRegionSearchOptions([
      DbTestHelper.locationWithPhotos({
        id: 'mont-saint-michel',
        name: 'Mont Saint Michel',
        country: 'France',
        latitude: 48.636,
        longitude: -1.5115,
      }),
      DbTestHelper.locationWithPhotos({
        id: 'paris',
        name: 'Paris',
        country: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
      }),
    ]);

    expect(filterMapRegionSearchOptions(options, 'mont saint michel')[0]).toMatchObject({
      label: 'Mont Saint Michel',
      source: 'location',
    });
  });

  test('keeps country results at country zoom', () => {
    const options = buildMapRegionSearchOptions([
      DbTestHelper.locationWithPhotos({
        id: 'mont-saint-michel',
        name: 'Mont Saint Michel',
        country: 'France',
      }),
    ]);

    expect(options).toContainEqual(
      expect.objectContaining({
        label: 'France',
        source: 'country',
        zoomLevel: MapTuning.countryViewZoomLevel,
      })
    );
  });
});
