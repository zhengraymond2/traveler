import { createBulkImageAddSourceInputs } from '../bulk-image-intake';

describe('bulk image intake', () => {
  test('creates one add-source input per selected image', () => {
    expect(createBulkImageAddSourceInputs(['file:///one.jpg', 'file:///two.jpg'])).toEqual([
      { sourcePhotoUris: ['file:///one.jpg'] },
      { sourcePhotoUris: ['file:///two.jpg'] },
    ]);
  });
});
