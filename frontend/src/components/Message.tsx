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
        <button
          onClick={onDismiss}
          style={{
            marginLeft: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            opacity: 0.7,
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
