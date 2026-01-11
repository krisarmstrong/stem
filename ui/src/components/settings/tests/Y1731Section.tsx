// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * Y1731Section Component
 *
 * ITU-T Y.1731 Ethernet OAM tests.
 * Includes: Delay (DMM/DMR), Loss (LMM/LMR), Synthetic Loss, Loopback.
 */

import { Radio } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type Y1731Config, Y1731ConfigForm } from '../../Y1731ConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface Y1731SectionProps extends TestSectionProps {
  config: Y1731Config;
  onConfigChange: (config: Y1731Config) => void;
}

const Y1731_TESTS: TestDefinition[] = [
  {
    id: 'y1731_delay',
    name: 'Delay (DMM/DMR)',
    desc: 'Frame delay measurement',
    tooltip: 'Measure one-way and two-way frame delay using DMM/DMR OAM messages.',
  },
  {
    id: 'y1731_loss',
    name: 'Loss (LMM/LMR)',
    desc: 'Frame loss measurement',
    tooltip: 'Measure frame loss ratio using LMM/LMR OAM messages.',
  },
  {
    id: 'y1731_slm',
    name: 'Synthetic Loss',
    desc: 'SLM measurement',
    tooltip: 'Synthetic loss measurement using SLM/SLR frames.',
  },
  {
    id: 'y1731_loopback',
    name: 'Loopback',
    desc: 'LBM/LBR test',
    tooltip: 'Verify connectivity using OAM loopback messages (LBM/LBR).',
  },
];

export function Y1731Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: Y1731SectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('y1731')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.y1731.title', 'Y.1731 OAM')}</span>
          <span className="caption text-text-muted">({selectedCount}/4)</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Test Selection */}
        <div className="space-y-2">
          {Y1731_TESTS.map((test) => (
            <TestCheckbox
              key={test.id}
              test={test}
              checked={selectedTests.includes(test.id)}
              onChange={() => onToggleTest(test.id)}
            />
          ))}
        </div>

        {/* Configuration Form */}
        {hasSelectedTests && (
          <div className="border-t border-surface-border pt-4">
            <Y1731ConfigForm
              config={config}
              setConfig={onConfigChange}
              selectedTests={selectedTests}
            />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default Y1731Section;
