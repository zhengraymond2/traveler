import { getDetailEventMapsUrl } from '../trip-maps';

describe('trip maps helpers', () => {
  test('uses a saved location Google Maps URL first', () => {
    expect(
      getDetailEventMapsUrl({
        addressText: null,
        googleMapsUrl: null,
        savedLocation: {
          googleMapsUrl: 'https://maps.google.com/?q=kyoto',
          name: 'Kyoto',
        },
      })
    ).toBe('https://maps.google.com/?q=kyoto');
  });

  test('falls back to saved location name search', () => {
    expect(
      getDetailEventMapsUrl({
        addressText: null,
        googleMapsUrl: null,
        savedLocation: {
          googleMapsUrl: null,
          name: 'Mont Saint Michel',
        },
      })
    ).toBe('https://www.google.com/maps/search/?api=1&query=Mont%20Saint%20Michel');
  });

  test('uses pasted Google Maps URLs before address search', () => {
    expect(
      getDetailEventMapsUrl({
        addressText: '10 Downing Street',
        googleMapsUrl: 'https://maps.app.goo.gl/example',
        savedLocation: null,
      })
    ).toBe('https://maps.app.goo.gl/example');
  });

  test('uses entered address search when no URL or saved location exists', () => {
    expect(
      getDetailEventMapsUrl({
        addressText: 'Senso-ji Tokyo',
        googleMapsUrl: null,
        savedLocation: null,
      })
    ).toBe('https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo');
  });

  test('returns null when there is nowhere to navigate', () => {
    expect(getDetailEventMapsUrl({ addressText: ' ', googleMapsUrl: null, savedLocation: null })).toBeNull();
  });
});
