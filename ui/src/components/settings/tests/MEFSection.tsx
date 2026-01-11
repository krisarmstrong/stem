// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * MEFSection Component
 *
 * MEF Carrier Ethernet service validation tests.
 * Includes: Configuration, Performance, Full Test.
 * Note: Uses same config as Y.1564 for service parameters.
 */

import { Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

const MEF_TESTS: TestDefinition[] = [
  {
    id: 'mef_config',
    name: 'Configuration',
    desc: 'Service step test',
    tooltip: 'MEF service configuration test - validates service at step loads.',
  },
  {
    id: 'mef_perf',
    name: 'Performance',
    desc: 'Sustained test',
    tooltip: 'MEF service performance test - verifies SLA compliance over time.',
  },
  {
    id: 'mef_full',
    name: 'Full Test',
    desc: 'Both phases',
    tooltip: 'Complete MEF validation including both configuration and performance.',
  },
];

export function MEFSection({ selectedTests, onToggleTest }: TestSectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('mef')).length,
    [selectedTests],
  );

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.mef.title', 'MEF Service')}</span>
          <span className="caption text-text-muted">({selectedCount}/3)</span>
        </div>
      }
    >
      <div className="space-y-2">
        {MEF_TESTS.map((test) => (
          <TestCheckbox
            key={test.id}
            test={test}
            checked={selectedTests.includes(test.id)}
            onChange={() => onToggleTest(test.id)}
          />
        ))}
      </div>
      {/* Note: MEF uses same config as Y.1564 for service parameters */}
    </CollapsibleSection>
  );
}

export default MEFSection;
