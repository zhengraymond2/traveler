import { DbTestHelper } from '../DbTestHelper';
import { EventsTestHelper } from '../EventsTestHelper';

describe('test helpers', () => {
  test('builds database-shaped location records with overrides', () => {
    const location = DbTestHelper.location({ name: 'Hokkaido cabin', country: 'Hokkaido' });

    expect(location.name).toBe('Hokkaido cabin');
    expect(location.country).toBe('Hokkaido');
    expect(location.createdAt).toBeInstanceOf(Date);
  });

  test('records event names and payloads in order', () => {
    const recorder = EventsTestHelper.createRecorder<'source_saved', { id: string }>();

    recorder.record('source_saved', { id: 'location-1' });

    expect(recorder.names()).toEqual(['source_saved']);
    expect(recorder.last()).toEqual({ name: 'source_saved', payload: { id: 'location-1' } });
  });
});
