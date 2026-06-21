import { createAddSourceInput, mergePhotos, parseCoordinates } from '../add-source-helpers';

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

  test('creates an image-only add source input', () => {
    expect(
      createAddSourceInput({
        googleMapsUrl: '',
        gpsCoordinates: '',
        instagramUrl: '',
        locationName: '',
        notes: '',
        photos: [{ uri: 'file:///great-wall.jpg' }],
        trailMapUrl: '',
      })
    ).toEqual({
      sourcePhotoUris: ['file:///great-wall.jpg'],
    });
  });

  test('creates an add source input with private notes and source links', () => {
    expect(
      createAddSourceInput({
        googleMapsUrl: ' https://maps.google.com/?q=Great+Wall ',
        gpsCoordinates: '40.4319, 116.5704',
        instagramUrl: ' https://www.instagram.com/p/source-post ',
        locationName: ' Great Wall ',
        notes: 'Inspired by this post',
        photos: [],
        trailMapUrl: '',
      })
    ).toEqual({
      name: 'Great Wall',
      instagramUrls: ['https://www.instagram.com/p/source-post'],
      googleMapsUrl: 'https://maps.google.com/?q=Great+Wall',
      gpsCoordinates: { latitude: 40.4319, longitude: 116.5704 },
      privateDescription: 'Inspired by this post',
    });
  });
});
