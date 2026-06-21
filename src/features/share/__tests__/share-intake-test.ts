import {
  buildAddSourceInputsFromSharedPayloads,
  buildShareIntakeLog,
  classifySharedPayload,
  loadExpoSharingModule,
} from '../share-intake';

describe('share intake helpers', () => {
  test('classifies Instagram links', () => {
    expect(
      classifySharedPayload({
        shareType: 'url',
        value: 'https://www.instagram.com/p/example',
      })
    ).toBe('instagram');
  });

  test('classifies Google Maps links', () => {
    expect(
      classifySharedPayload({
        shareType: 'url',
        value: 'https://maps.app.goo.gl/example',
      })
    ).toBe('google-maps');
  });

  test('classifies generic text', () => {
    expect(
      classifySharedPayload({
        shareType: 'text',
        value: 'Try this restaurant next time.',
      })
    ).toBe('text');
  });

  test('classifies image payloads', () => {
    expect(
      classifySharedPayload({
        shareType: 'image',
        value: 'file:///photo.jpg',
      })
    ).toBe('image');
  });

  test('classifies file payloads', () => {
    expect(
      classifySharedPayload({
        shareType: 'file',
        value: 'file:///export.json',
      })
    ).toBe('file');
  });

  test('classifies unmatched payloads as unknown', () => {
    expect(
      classifySharedPayload({
        shareType: 'audio',
        value: 'file:///voice-note.m4a',
      })
    ).toBe('unknown');
  });

  test('builds a console-ready log object with raw and resolved payloads', () => {
    const payloads = [
      {
        mimeType: 'text/plain',
        shareType: 'text',
        value: 'https://www.google.com/maps/place/Tokyo+Tower',
      },
    ];
    const resolvedPayloads = [
      {
        contentMimeType: 'text/html',
        contentSize: 1234,
        contentType: 'website',
        contentUri: 'https://www.google.com/maps/place/Tokyo+Tower',
        originalName: 'Tokyo Tower',
        shareType: 'url',
        value: 'https://www.google.com/maps/place/Tokyo+Tower',
      },
    ];

    expect(buildShareIntakeLog(payloads, resolvedPayloads)).toEqual({
      classifications: ['google-maps'],
      payloads,
      receivedAt: expect.any(String),
      resolvedPayloads,
      source: 'expo-sharing',
    });
  });

  test('treats a missing ExpoSharing native module as unavailable instead of throwing', () => {
    const module = loadExpoSharingModule(() => {
      throw new Error("Cannot find native module 'ExpoSharing'");
    });

    expect(module).toBeNull();
  });

  test('converts shared Instagram, Google Maps, and image payloads to add-source inputs', () => {
    expect(
      buildAddSourceInputsFromSharedPayloads([
        {
          shareType: 'url',
          value: 'https://www.instagram.com/p/example',
        },
        {
          shareType: 'url',
          value: 'https://maps.app.goo.gl/example',
        },
        {
          shareType: 'image',
          value: 'file:///photo.jpg',
        },
      ])
    ).toEqual([
      {
        instagramUrls: ['https://www.instagram.com/p/example'],
      },
      {
        googleMapsUrl: 'https://maps.app.goo.gl/example',
      },
      {
        sourcePhotoUris: ['file:///photo.jpg'],
      },
    ]);
  });
});
