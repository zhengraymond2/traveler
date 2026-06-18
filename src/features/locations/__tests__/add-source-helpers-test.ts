import { mergePhotos, parseCoordinates } from '../add-source-helpers';

describe('add source helpers', () => {
  test('parses comma-separated GPS coordinates', () => {
    expect(parseCoordinates('37.7749, -122.4194')).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  test('returns undefined for blank GPS coordinates', () => {
    expect(parseCoordinates('   ')).toBeUndefined();
  });

  test('rejects malformed GPS coordinates', () => {
    expect(() => parseCoordinates('not coordinates')).toThrow('GPS coordinates should look like');
  });

  test('deduplicates newly selected photos by uri', () => {
    const currentPhotos = [{ uri: 'file:///one.jpg', fileName: 'one.jpg' }];
    const nextPhotos = [
      { uri: 'file:///one.jpg', fileName: 'duplicate.jpg' },
      { uri: 'file:///two.jpg', fileName: 'two.jpg' },
      { uri: 'file:///two.jpg', fileName: 'two-again.jpg' },
    ];

    expect(mergePhotos(currentPhotos, nextPhotos)).toEqual([
      { uri: 'file:///one.jpg', fileName: 'one.jpg' },
      { uri: 'file:///two.jpg', fileName: 'two.jpg' },
    ]);
  });
});
