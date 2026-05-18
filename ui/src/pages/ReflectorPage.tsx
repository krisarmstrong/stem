import { Repeat } from 'lucide-react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { PageHeader } from '../ui/PageHeader';

/**
 * Reflector mode landing page.
 *
 * The actual reflector controls — interface selection, start/stop, and
 * live counters — live in the legacy header + main shell in App.tsx
 * which renders alongside this page. This component contributes the
 * page-level breadcrumb + header context. The full reflector control
 * UI will be extracted into this page in a follow-up commit.
 */
export function ReflectorPage() {
  return (
    <section className="space-y-6">
      <Breadcrumbs />
      <PageHeader
        icon={Repeat}
        title="Reflector"
        description="Loopback reflector — bounces frames back to the test master for end-to-end measurement."
        iconColorClass="text-[var(--color-module-reflector)]"
      />
      <div className="rounded-lg border border-surface-border bg-surface-raised p-4 text-sm text-text-muted">
        Use the controls above to pick an interface and start the reflector. Stats stream live in
        the existing dashboard area.
      </div>
    </section>
  );
}
