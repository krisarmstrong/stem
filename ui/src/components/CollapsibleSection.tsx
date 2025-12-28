import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
  className = '',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const baseStyles = variant === 'default'
    ? 'border border-[var(--color-surface-border)] rounded-lg overflow-hidden'
    : '';

  const headerStyles = variant === 'default'
    ? 'px-4 py-3 bg-[var(--color-surface-raised)]'
    : 'py-2';

  const contentStyles = variant === 'default'
    ? 'px-4 py-3 bg-[var(--color-surface-base)]'
    : 'py-2 pl-6';

  return (
    <section className={`${baseStyles} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 text-left hover:bg-[var(--color-surface-hover)] transition-colors ${headerStyles}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          {title}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        )}
      </button>

      {isOpen && (
        <div className={contentStyles}>
          {children}
        </div>
      )}
    </section>
  );
}

export default CollapsibleSection;
