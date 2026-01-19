import { CloseButton } from './CloseButton';

interface MessageProps {
  type: 'success' | 'error';
  text: string;
  onDismiss?: () => void;
}

export function Message({ type, text, onDismiss }: MessageProps) {
  return (
    <div className={`message ${type}`}>
      {text}
      {onDismiss && (
        <CloseButton
          size="sm"
          variant="subtle"
          onClick={onDismiss}
          label="Dismiss message"
          style={{ marginLeft: '12px' }}
        />
      )}
    </div>
  );
}
