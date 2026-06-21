import { DbTestHelper } from '@/test/DbTestHelper';

import { getCollectionRows } from '../collection-rows';

describe('collection rows', () => {
  test('sorts regular collections alphabetically before shared collections', () => {
    const rows = getCollectionRows([
      {
        id: '2',
        title: 'Weekend',
        kind: 'local',
        locations: [],
      },
      {
        id: '3',
        title: 'Azores',
        kind: 'shared',
        locations: [],
      },
      {
        id: '1',
        title: 'Alps',
        kind: 'local',
        locations: [],
      },
    ]);

    expect(rows.map((row) => row.title)).toEqual(['Alps', 'Weekend', 'Azores']);
  });

  test('uses a stable member photo as the collection image', () => {
    const photo = DbTestHelper.locationPhoto({ uri: 'file:///azores.jpg' });

    const rows = getCollectionRows([
      {
        id: 'azores',
        title: 'Azores',
        kind: 'local',
        locations: [DbTestHelper.locationWithPhotos({ id: 'pico', photos: [photo] })],
      },
    ]);

    expect(rows[0]).toMatchObject({
      id: 'azores',
      title: 'Azores',
      imageUri: 'file:///azores.jpg',
    });
  });
});
