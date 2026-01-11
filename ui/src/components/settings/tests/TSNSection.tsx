// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * TSNSection Component
 *
 * IEEE 802.1Qbv Time-Sensitive Networking tests.
 * Includes: Gate Timing, Traffic Isolation, Scheduled Latency, Full Suite.
 */

import { Cpu } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type TSNConfig, TSNConfigForm } from '../../TSNConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface TSNSectionProps extends TestSectionProps {
  config: TSNConfig;
  onConfigChange: (config: TSNConfig) => void;
}

const TSN_TESTS: TestDefinition[] = [
  {
    id: 'tsn_timing',
    name: 'Gate Timing',
    desc: 'GCL accuracy',
    tooltip: 'Verify Time-Aware Shaper (TAS) gate control list timing accuracy.',
  },
  {
    id: 'tsn_isolation',
    name: 'Traffic Isolation',
    desc: 'Class isolation',
    tooltip: 'Verify traffic class separation and priority enforcement.',
  },
  {
    id: 'tsn_latency',
    name: 'Scheduled Latency',
    desc: 'Deterministic delay',
    tooltip: 'Measure deterministic latency for scheduled traffic flows.',
  },
  {
    id: 'tsn_full',
    name: 'Full Suite',
    desc: 'All TSN tests',
    tooltip: 'Complete TSN validation including timing, isolation, and latency.',
  },
];

export function TSNSection({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: TSNSectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('tsn')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.tsn.title', 'TSN 802.1Qbv')}</span>
          <span className="caption text-text-muted">({selectedCount}/4)</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Test Selection */}
        <div className="space-y-2">
          {TSN_TESTS.map((test) => (
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
            <TSNConfigForm
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

export default TSNSection;
