import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/constants/config';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label, placeholder, value, onChangeText, error, secureTextEntry, multiline
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, multiline && styles.multiline]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SIZES.md },
  label: { fontSize: SIZES.body, fontWeight: '500', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  input: {
    backgroundColor: COLORS.gray1, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.body, color: COLORS.textPrimary
  },
  inputError: { borderColor: COLORS.error },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { fontSize: SIZES.caption, color: COLORS.error, marginTop: SIZES.xs },
});
