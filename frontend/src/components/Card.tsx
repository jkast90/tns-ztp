import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headerAction, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || headerAction) && (
        <div className="card-header">
          {title && <h2>{title}</h2>}
          {headerAction && <div className="card-header-action">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
