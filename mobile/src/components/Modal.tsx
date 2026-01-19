import { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Optional subtitle shown below title */
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Height preset: 'small' (50%), 'medium' (70%), 'large' (85%), 'full' (95%) */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Whether to use KeyboardAvoidingView for forms */
  keyboardAware?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'large',
  keyboardAware = false,
}: Props) {
  const { colors } = useAppTheme();

  const sizeStyles = {
    small: { minHeight: '50%' as const, maxHeight: '60%' as const },
    medium: { minHeight: '65%' as const, maxHeight: '80%' as const },
    large: { minHeight: '75%' as const, maxHeight: '90%' as const },
    full: { minHeight: '90%' as const, maxHeight: '95%' as const },
  };

  const contentStyle = [
    styles.modalContent,
    { backgroundColor: colors.bgCard },
    sizeStyles[size] as { minHeight: `${number}%`; maxHeight: `${number}%` },
  ];

  const content = (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={contentStyle}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {footer && (
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            {footer}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </RNModal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    gap: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
});
