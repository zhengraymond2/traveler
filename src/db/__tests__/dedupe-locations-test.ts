import { getDedupeLocationKey } from '../dedupe-locations';

describe('location dedupe helpers', () => {
  test('builds the same dedupe key for matching locations with different casing', () => {
    expect(getDedupeLocationKey({ name: '  Cafe Roma ', country: 'azores' })).toEqual(
      getDedupeLocationKey({ name: 'cafe roma', country: 'Azores' })
    );
  });

  test('does not build a dedupe key without a name', () => {
    expect(getDedupeLocationKey({ name: '   ', country: 'PNW' })).toBeNull();
  });
});
