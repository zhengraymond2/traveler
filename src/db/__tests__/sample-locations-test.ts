import { sampleLocations } from '../sample-locations';

type JapanDensityMarker = {
  name: string;
  latitude: number;
  longitude: number;
};

describe('sample locations', () => {
  test('keeps Japan density markers city-centered while making each cluster less dense and more spread out', () => {
    const groupedMarkers = groupJapanDensityMarkers();

    expect(groupedMarkers.size).toBeGreaterThan(10);

    for (const markers of groupedMarkers.values()) {
      expect(markers).toHaveLength(7);

      const anchorMarker = markers.find((marker) => marker.name.endsWith(' Marker 01'));

      expect(anchorMarker).toBeDefined();
      expect(getCoordinateSpan(markers, 'latitude')).toBeGreaterThanOrEqual(0.14);
      expect(getCoordinateSpan(markers, 'longitude')).toBeGreaterThanOrEqual(0.14);

      for (const marker of markers) {
        expect(Math.abs(marker.latitude - anchorMarker!.latitude)).toBeLessThanOrEqual(0.09);
        expect(Math.abs(marker.longitude - anchorMarker!.longitude)).toBeLessThanOrEqual(0.09);
      }
    }
  });
});

function groupJapanDensityMarkers() {
  const groupedMarkers = new Map<string, JapanDensityMarker[]>();

  for (const marker of getJapanDensityMarkers()) {
    const anchorName = marker.name.replace(/ Marker \d{2}$/, '');
    const markers = groupedMarkers.get(anchorName) ?? [];

    markers.push(marker);
    groupedMarkers.set(anchorName, markers);
  }

  return groupedMarkers;
}

function getJapanDensityMarkers(): JapanDensityMarker[] {
  return sampleLocations.filter(
    (location): location is JapanDensityMarker =>
      location.country === 'Japan' &&
      typeof location.name === 'string' &&
      / Marker \d{2}$/.test(location.name) &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
  );
}

function getCoordinateSpan(markers: JapanDensityMarker[], coordinate: 'latitude' | 'longitude') {
  const values = markers.map((marker) => marker[coordinate]);

  return Math.max(...values) - Math.min(...values);
}
