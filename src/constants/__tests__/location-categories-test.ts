import { getLocationCategoryAppearance, getLocationCategoryKind } from '../location-categories';

describe('location categories', () => {
  test.each([
    ['airport lounge', 'airport'],
    ['surf break', 'surf'],
    ['ski resort', 'ski'],
    ['train station', 'train_station'],
    ['viewpoint', 'viewpoint'],
    ['museum', 'museum'],
  ])('maps %s to %s', (input, expectedKind) => {
    expect(getLocationCategoryKind(input)).toBe(expectedKind);
  });

  test('falls back to attraction for unknown categories', () => {
    expect(getLocationCategoryKind('weird little errand')).toBe('attraction');
  });

  test('associates each category with a visible marker glyph', () => {
    const appearance = getLocationCategoryAppearance('diving spot');

    expect(appearance.kind).toBe('diving');
    expect(appearance.glyph).toBeTruthy();
    expect(appearance.label).toBe('Diving spot');
  });
});
