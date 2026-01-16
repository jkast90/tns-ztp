import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  error,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.select, error && styles.selectError]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.selectText, !selectedOption && styles.placeholder]}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.option,
                      item.value === value && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && (
                      <Ionicons name="checkmark" size={20} color="#7c3aed" />
                    )}
                  </Pressable>
                )}
              />
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  select: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectError: {
    borderColor: '#ff5252',
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#666',
  },
  error: {
    color: '#ff5252',
    fontSize: 12,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  optionSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#7c3aed',
    fontWeight: '500',
  },
});
