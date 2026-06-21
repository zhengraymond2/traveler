export const MapTuning = {
  countryViewZoomLevel: 4.15,
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
  searchTop: 74,
  compassTop: 132,
  locationTop: 190,
  size: 46,
  gap: 12,
} as const;

export const PhotoPinDensityStops = [
  { maxZoom: 2, sampleRatio: 1, pinBudget: 30 },
  { maxZoom: 4, sampleRatio: 1, pinBudget: 45 },
  { maxZoom: 6, sampleRatio: 1, pinBudget: 60 },
  { maxZoom: 8, sampleRatio: 1, pinBudget: 90 },
  { maxZoom: Number.POSITIVE_INFINITY, sampleRatio: 1, pinBudget: 100 },
] as const;
