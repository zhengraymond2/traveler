import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MapRegionSearch } from '../map-region-search';
import { UITestHelper } from '@/test/UITestHelper';

describe('MapRegionSearch', () => {
  test('places the expanded search panel above sibling map controls', async () => {
    const screen = await UITestHelper.renderWithPaper(<MapRegionSearch options={[]} onSelect={jest.fn()} />);

    fireEvent.press(screen.getByText('󰍉'));

    const input = await screen.findByPlaceholderText('Search countries, regions, or locations');
    const inputRow = input.parent;
    const expandedPanel = inputRow?.parent;
    const expandedPanelStyle = StyleSheet.flatten(expandedPanel?.props.style);

    expect(expandedPanelStyle).toMatchObject({
      zIndex: 10,
      elevation: 10,
    });
  });
});
