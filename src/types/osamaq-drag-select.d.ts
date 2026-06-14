declare module '@osamaq/drag-select' {
  import type { PanGesture, TapGesture } from 'react-native-gesture-handler';
  import type { AnimatedRef, DerivedValue } from 'react-native-reanimated';
  import type { ReanimatedScrollEvent } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

  type PropertyPath<T> = Extract<keyof T, string> | string;

  export type DragSelectConfig<ListItem extends Record<string, unknown>> = {
    data: ListItem[];
    key: PropertyPath<ListItem>;
    list: {
      animatedRef: AnimatedRef<any>;
      columnGap?: number;
      contentInset?: {
        bottom?: number;
        left?: number;
        right?: number;
        top?: number;
      };
      horizontal?: boolean;
      itemSize: {
        height: number;
        width: number;
      };
      numColumns?: number;
      numRows?: number;
      rowGap?: number;
    };
    longPressGesture?: {
      enabled?: boolean;
      minDurationMs?: number;
    };
    onItemDeselected?: (id: string, index: number) => void;
    onItemPress?: (id: string, index: number) => void;
    onItemSelected?: (id: string, index: number) => void;
    panGesture?: {
      resetSelectionOnStart?: boolean;
      scrollEnabled?: boolean;
      scrollEndMaxVelocity?: number;
      scrollEndThreshold?: number;
      scrollStartMaxVelocity?: number;
      scrollStartThreshold?: number;
    };
    tapGesture?: {
      selectOnTapEnabled: boolean;
    };
  };

  export type DragSelect = {
    gestures: {
      createItemPressHandler: (id: string, index: number) => TapGesture;
      panHandler: PanGesture;
    };
    onScroll: (event: ReanimatedScrollEvent) => void;
    selection: {
      active: DerivedValue<boolean>;
      add: (id: string) => void;
      clear: () => void;
      delete: (id: string) => boolean;
      has: (id: string) => boolean;
      items: DerivedValue<Record<string, number>>;
      size: DerivedValue<number>;
      ui: {
        add: (id: string) => void;
        clear: () => void;
        delete: (id: string) => void;
        has: (id: string) => boolean;
      };
    };
  };

  export function useDragSelect<ListItem extends Record<string, unknown>>(
    config: DragSelectConfig<ListItem>
  ): DragSelect;
}
