import * as React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { InstagramFeedPanel } from '../instagram-feed-panel';
import { UITestHelper } from '@/test/UITestHelper';

describe('InstagramFeedPanel', () => {
  test('renders an openable public Instagram feed link', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const screen = await UITestHelper.renderWithPaper(
      <InstagramFeedPanel feedUrl="https://www.instagram.com/explore/locations/236834088/great-wall-of-china/" />
    );

    fireEvent.press(screen.getByText('Open Instagram feed'));

    expect(screen.getByText('Public Instagram feed')).toBeTruthy();
    expect(openURL).toHaveBeenCalledWith('https://www.instagram.com/explore/locations/236834088/great-wall-of-china/');
    openURL.mockRestore();
  });
});
