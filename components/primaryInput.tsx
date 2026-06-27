import { StyleSheet, TextInput, View } from 'react-native';

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad'
    | 'url'
    | 'web-search';
}

export default function PrimaryInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: InputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#a4b0be"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  input: {
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    fontSize: 16,
    color: '#2f3640',
    borderWidth: 1,
    borderColor: '#dcdde1',
  },
});
