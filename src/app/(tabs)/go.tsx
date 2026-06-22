import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function GoScreen() {
  const theme = useTheme();

  return <View style={[styles.root, { backgroundColor: theme.colors.background }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
