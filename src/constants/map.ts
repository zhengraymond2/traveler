const countryViewZoomLevel = 4.15;

export const MapTuning = {
  countryViewZoomLevel,
  locationSearchZoomLevel: countryViewZoomLevel + 1,
  cameraAnimationDurationMs: 900,
  previewGalleryCellCount: 9,
  terrainSourceId: 'mapbox-terrain-dem',
  mapboxTerrainDemUrl: 'mapbox://mapbox.mapbox-terrain-dem-v1',
} as const;

export const MapGestureSettings = {
  pitchEnabled: true,
  rotateEnabled: true,
  simultaneousRotateAndPinchZoomEnabled: true,
} as const;

export const MapTerrainStyle = {
  exaggeration: 1.25,
} as const;

export const MapControlLayout = {
  right: 27,
  top: 74,
  navTop: 135,
  size: 38,
  gap: 12,
} as const;
