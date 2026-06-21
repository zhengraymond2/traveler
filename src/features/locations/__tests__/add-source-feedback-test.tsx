import * as React from 'react';

import { AddSourceFeedback } from '../add-source-feedback';
import { UITestHelper } from '@/test/UITestHelper';

describe('add source feedback', () => {
  test('shows processing feedback for unmatched locations', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <AddSourceFeedback
        result={{
          emittedEvent: null,
          localLocation: {
            addedAt: '2026-06-21T12:00:00.000Z',
            canonicalLocationId: null,
            id: 'local-location-1',
            lastPartialLocationId: 'partial-1',
            privateDescription: null,
            sourceInstagramUrls: [],
            sourceLinks: [],
            sourcePhotoUris: [],
            status: 'processing',
            updatedAt: '2026-06-21T12:00:00.000Z',
          },
          matchedLocations: [],
          processingCount: 1,
        }}
      />
    );

    expect(screen.getByText('1 location is being processed.')).toBeTruthy();
  });

  test('shows matched canonical locations', async () => {
    const screen = await UITestHelper.renderWithPaper(
      <AddSourceFeedback
        result={{
          emittedEvent: null,
          localLocation: {
            addedAt: '2026-06-21T12:00:00.000Z',
            canonicalLocationId: 'location-1',
            id: 'local-location-1',
            lastPartialLocationId: 'partial-1',
            privateDescription: null,
            sourceInstagramUrls: [],
            sourceLinks: [],
            sourcePhotoUris: [],
            status: 'matched',
            updatedAt: '2026-06-21T12:00:00.000Z',
          },
          matchedLocations: [
            {
              allTrailsUrl: null,
              createdAt: '2026-06-21T12:00:00.000Z',
              fieldConfidenceJson: null,
              googleMapsUrl: null,
              id: 'location-1',
              instagramFeedUrl: null,
              latitude: null,
              longitude: null,
              name: 'Great Wall of China',
              updatedAt: '2026-06-21T12:00:00.000Z',
            },
          ],
          processingCount: 0,
        }}
      />
    );

    expect(screen.getByText('Matched locations')).toBeTruthy();
    expect(screen.getByText('Great Wall of China')).toBeTruthy();
  });
});
