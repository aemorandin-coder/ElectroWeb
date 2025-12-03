import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 animate-fadeIn">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-[#f8f9fa] rounded-xl mb-4">
        <div className="text-[#6a6c6b]">{icon}</div>
      </div>
      <h3 className="text-sm font-semibold text-[#212529] mb-1">{title}</h3>
      {description && <p className="text-xs text-[#6a6c6b] mb-4">{description}</p>}
      {action && <div className="flex justify-center mt-4">{action}</div>}
    </div>
  );
}
