import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import { paperTheme } from '@/constants/paper-theme';

export const UITestHelper = {
  renderWithPaper(ui: ReactElement, options?: RenderOptions) {
    return render(ui, {
      wrapper: ({ children }) => <PaperProvider theme={paperTheme}>{children}</PaperProvider>,
      ...options,
    });
  },
};
