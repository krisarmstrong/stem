// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * TrafficGenSection Component
 *
 * Custom traffic generation tests.
 * Includes: Custom Stream, Burst Mode, Multi-Stream.
 */

import { Radio } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type TrafficGenConfig, TrafficGenConfigForm } from '../../TrafficGenConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface TrafficGenSectionProps extends TestSectionProps {
  config: TrafficGenConfig;
  onConfigChange: (config: TrafficGenConfig) => void;
}

const TRAFFICGEN_TESTS: TestDefinition[] = [
  {
    id: 'custom_stream',
    name: 'Custom Stream',
    desc: 'Configurable traffic',
    tooltip: 'Generate custom traffic patterns with configurable frame size, rate, and duration.',
  },
  {
    id: 'trafficgen_burst',
    name: 'Burst Mode',
    desc: 'Burst traffic generation',
    tooltip: 'Generate burst traffic with configurable burst size and gap.',
  },
  {
    id: 'trafficgen_multistream',
    name: 'Multi-Stream',
    desc: 'Multiple traffic streams',
    tooltip: 'Generate multiple concurrent traffic streams with different parameters.',
  },
];

export function TrafficGenSection({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: TrafficGenSectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () =>
      selectedTests.filter((test) => test.includes('stream') || test.includes('trafficgen')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.trafficgen.title', 'Traffic Generator')}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Test Selection */}
        <div className="space-y-2">
          {TRAFFICGEN_TESTS.map((test) => (
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
            <TrafficGenConfigForm
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

export default TrafficGenSection;
