import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { neumo, neumoText } from '../utils/neumorphic';

interface InlineErrorMessageProps {
  title: string;
  message: string;
}

export default function InlineErrorMessage({ title, message }: InlineErrorMessageProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#D96C6C',
    borderRadius: neumo.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  title: {
    ...neumoText.heading,
    fontSize: 13,
    color: '#9B2C2C',
    marginBottom: 2,
  },
  message: {
    ...neumoText.body,
    fontSize: 12,
    color: '#6B2020',
  },
});
