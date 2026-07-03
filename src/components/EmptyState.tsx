import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Emoji string or icon element (e.g. a lucide icon sized with `h-12 w-12`). */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action rendered under the description. */
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon flex justify-center text-fg-tertiary">{icon}</span>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-text">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
