import { createFixtureLocationRecognizer, greatWallFixturePhotoUri } from '../fixture-location-recognizer';

describe('fixture location recognizer', () => {
  test('recognizes the Great Wall fixture image', async () => {
    const recognizer = createFixtureLocationRecognizer();

    await expect(
      recognizer.recognize({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        sourcePhotoUris: [greatWallFixturePhotoUri],
      })
    ).resolves.toMatchObject({
      kind: 'recognized',
      location: {
        name: 'Great Wall of China',
      },
    });
  });

  test('fails unknown fixture inputs explicitly', async () => {
    const recognizer = createFixtureLocationRecognizer();

    await expect(
      recognizer.recognize({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        name: 'Unknown smoke location',
      })
    ).resolves.toEqual({
      kind: 'failed',
      reason: 'Fixture recognizer has no match for this partial location.',
    });
  });
});
