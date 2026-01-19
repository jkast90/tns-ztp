import type { ReactNode } from 'react';
import { Card } from './Card';
import { SpinnerIcon } from './Icon';

interface LoadingStateProps {
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Content to render when not loading and no error */
  children: ReactNode;
  /** Custom loading message */
  loadingMessage?: string;
  /** Whether to wrap in a Card when loading/error */
  wrapInCard?: boolean;
}

/**
 * Wrapper component that handles loading and error states.
 * Shows loading spinner when loading, error message on error,
 * or children when data is ready.
 *
 * @example
 * <LoadingState loading={loading} error={error} loadingMessage="Loading devices...">
 *   <DeviceList devices={devices} />
 * </LoadingState>
 *
 * @example
 * // Without card wrapper
 * <LoadingState loading={loading} error={error} wrapInCard={false}>
 *   {content}
 * </LoadingState>
 */
export function LoadingState({
  loading,
  error,
  children,
  loadingMessage = 'Loading...',
  wrapInCard = true,
}: LoadingStateProps) {
  if (loading) {
    const content = (
      <div className="loading-state">
        <SpinnerIcon size={32} />
        <p>{loadingMessage}</p>
      </div>
    );
    return wrapInCard ? <Card>{content}</Card> : content;
  }

  if (error) {
    const content = <div className="message error">{error}</div>;
    return wrapInCard ? <Card>{content}</Card> : content;
  }

  return <>{children}</>;
}

/**
 * Inline loading indicator for smaller contexts.
 */
export function InlineLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="inline-loading">
      <SpinnerIcon size={16} />
      <span>{message}</span>
    </div>
  );
}
