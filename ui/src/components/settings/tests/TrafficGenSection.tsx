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

/** Test ID to translation key mapping */
const TEST_KEYS = {
  custom_stream: 'stream',
  trafficgen_burst: 'burst',
  trafficgen_multistream: 'multistream',
} as const;

const TEST_IDS = Object.keys(TEST_KEYS) as Array<keyof typeof TEST_KEYS>;

export function TrafficGenSection({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: TrafficGenSectionProps) {
  const { t } = useTranslation('settings');

  const tests: TestDefinition[] = useMemo(
    () =>
      TEST_IDS.map((id) => {
        const key = TEST_KEYS[id];
        return {
          id,
          name: t(`tests.trafficgen.${key}.name`),
          desc: t(`tests.trafficgen.${key}.desc`),
          tooltip: t(`tests.trafficgen.${key}.tooltip`),
        };
      }),
    [t],
  );

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
          {tests.map((test) => (
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
