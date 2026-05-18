/**
 * RoleChip — persistent header control for switching the stem role.
 *
 * Segmented control with two values: Reflector / Test Master. Clicking
 * the inactive value pops a ConfirmModal explaining the consequences
 * (active reflector or in-progress test will be cancelled). On confirm
 * the role flips via RoleContext.
 *
 * Today the change is local-only; the backend role-switch endpoint
 * does not yet exist (see TODO(#66) in RoleContext.tsx).
 */
import { Repeat, Target } from 'lucide-react';
import { type FC, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StemRole, useRole } from '../contexts/RoleContext';
import { ConfirmModal } from './ui/ConfirmModal';

interface RoleChipProps {
  className?: string;
}

interface RoleOption {
  id: StemRole;
  labelKey: string;
  labelDefault: string;
  icon: typeof Repeat;
}

const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    id: 'reflector',
    labelKey: 'role.reflector',
    labelDefault: 'Reflector',
    icon: Repeat,
  },
  {
    id: 'test_master',
    labelKey: 'role.testMaster',
    labelDefault: 'Test Master',
    icon: Target,
  },
];

export const RoleChip: FC<RoleChipProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { role, setRole } = useRole();
  const [pendingRole, setPendingRole] = useState<StemRole | null>(null);

  const handleClick = useCallback(
    (next: StemRole): void => {
      if (next === role) {
        return;
      }
      setPendingRole(next);
    },
    [role],
  );

  const handleConfirm = useCallback((): void => {
    if (pendingRole) {
      setRole(pendingRole);
    }
    setPendingRole(null);
  }, [pendingRole, setRole]);

  const handleCancel = useCallback((): void => {
    setPendingRole(null);
  }, []);

  const confirmTitleKey =
    pendingRole === 'test_master'
      ? 'role.confirm.toTestMaster.title'
      : 'role.confirm.toReflector.title';
  const confirmTitleDefault =
    pendingRole === 'test_master' ? 'Switch to Test Master?' : 'Switch to Reflector?';
  const confirmMessageKey =
    pendingRole === 'test_master'
      ? 'role.confirm.toTestMaster.message'
      : 'role.confirm.toReflector.message';
  const confirmMessageDefault =
    pendingRole === 'test_master'
      ? 'The current Reflector will stop. Any in-progress tests will be cancelled.'
      : 'Any in-progress test will be cancelled. This stem will start as a Reflector.';

  return (
    <>
      <fieldset
        className={`inline-flex items-center gap-0 rounded-lg border border-surface-border bg-surface-raised p-0.5 ${className}`}
        aria-label={t('role.label', 'Stem role')}
      >
        <legend className="sr-only">{t('role.label', 'Stem role')}</legend>
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = role === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleClick(option.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                active
                  ? 'bg-brand-primary text-text-inverse shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
              aria-pressed={active}
              data-testid={`role-chip-${option.id}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(option.labelKey, option.labelDefault)}</span>
            </button>
          );
        })}
      </fieldset>

      <ConfirmModal
        isOpen={pendingRole !== null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={t(confirmTitleKey, confirmTitleDefault)}
        message={t(confirmMessageKey, confirmMessageDefault)}
        confirmLabel={t('role.confirm.confirmLabel', 'Switch role')}
        cancelLabel={t('buttons.cancel', 'Cancel')}
        confirmTone="violet"
      />
    </>
  );
};

export default RoleChip;
