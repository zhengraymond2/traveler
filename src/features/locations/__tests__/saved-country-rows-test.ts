import { DbTestHelper } from '@/test/DbTestHelper';

import { getCountryRows } from '../saved-country-rows';

describe('saved country rows', () => {
  test('groups saved locations case-insensitively by visible region label', () => {
    const rows = getCountryRows([
      DbTestHelper.locationWithPhotos({ id: '1', country: 'pnw', name: 'Rainier' }),
      DbTestHelper.locationWithPhotos({ id: '2', country: 'PNW', name: 'Olympic' }),
      DbTestHelper.locationWithPhotos({ id: '3', country: 'Japan', name: 'Tokyo' }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(['Japan', 'PNW']);
  });

  test('sorts unknown regions last', () => {
    const rows = getCountryRows([
      DbTestHelper.locationWithPhotos({ id: '1', country: null, name: 'Mystery' }),
      DbTestHelper.locationWithPhotos({ id: '2', country: 'Azores', name: 'Pico' }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(['Azores', 'Unknown']);
  });

  test('picks a stable photo for a region row', () => {
    const photo = DbTestHelper.locationPhoto({ uri: 'file:///azores.jpg' });

    const rows = getCountryRows([
      DbTestHelper.locationWithPhotos({ id: '1', country: 'Azores', photos: [photo] }),
    ]);

    expect(rows).toEqual([{ name: 'Azores', imageUri: 'file:///azores.jpg' }]);
  });
});
