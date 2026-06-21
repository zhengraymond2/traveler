import {
  localLocationSourceLinks,
  localLocationSourcePhotos,
  localLocations,
  locations,
} from '../schema';

describe('location recognition cache schema', () => {
  test('canonical locations store instagram feed metadata without source photos', () => {
    expect(locations.instagramFeedUrl.name).toBe('instagram_feed_url');
    expect(locations.fieldConfidenceJson.name).toBe('field_confidence_json');
    expect('sourcePhotoUri' in locations).toBe(false);
  });

  test('local locations store private source status and canonical link', () => {
    expect(localLocations.status.name).toBe('status');
    expect(localLocations.canonicalLocationId.name).toBe('canonical_location_id');
    expect(localLocations.lastPartialLocationId.name).toBe('last_partial_location_id');
  });

  test('source photos and links live in local private child tables', () => {
    expect(localLocationSourcePhotos.uri.name).toBe('uri');
    expect(localLocationSourceLinks.url.name).toBe('url');
    expect(localLocationSourceLinks.kind.name).toBe('kind');
  });
});
