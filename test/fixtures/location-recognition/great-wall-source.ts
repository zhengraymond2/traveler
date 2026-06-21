import type { PartialLocation } from '@/services/contracts';

export const greatWallSourcePhotoUri = 'file:///fixtures/great-wall-of-china.jpg';

export const greatWallSourceFixture: PartialLocation = {
  id: 'partial-great-wall',
  sourcePhotoUris: [greatWallSourcePhotoUri],
  createdAt: '2026-06-21T12:00:00.000Z',
};
