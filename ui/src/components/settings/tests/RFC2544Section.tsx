// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * RFC2544Section Component
 *
 * RFC 2544 network benchmarking test selection and configuration.
 * Includes: Throughput, Latency, Frame Loss, Back-to-Back, System Recovery, Reset.
 */

import { Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type RFC2544Config, RFC2544ConfigForm } from '../../RFC2544ConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface RFC2544SectionProps extends TestSectionProps {
  config: RFC2544Config;
  onConfigChange: (config: RFC2544Config) => void;
}

const RFC2544_TESTS: TestDefinition[] = [
  {
    id: 'rfc2544_throughput',
    name: 'Throughput',
    desc: 'Max rate with 0% loss',
    tooltip:
      'Find the maximum rate at which the DUT can forward frames with zero packet loss using binary search.',
  },
  {
    id: 'rfc2544_latency',
    name: 'Latency',
    desc: 'Round-trip time',
    tooltip: 'Measure round-trip packet delay at various loads and frame sizes.',
  },
  {
    id: 'rfc2544_frame_loss',
    name: 'Frame Loss',
    desc: 'Loss vs offered load',
    tooltip: 'Measure packet loss percentage across different offered load levels.',
  },
  {
    id: 'rfc2544_back_to_back',
    name: 'Back-to-Back',
    desc: 'Burst capacity',
    tooltip: 'Test maximum burst capacity - how many frames at line rate before drops occur.',
  },
  {
    id: 'rfc2544_system_recovery',
    name: 'System Recovery',
    desc: 'Recovery after overload',
    tooltip: 'Measure time to recover normal forwarding after sustained overload condition.',
  },
  {
    id: 'rfc2544_reset',
    name: 'Reset',
    desc: 'Device reset recovery',
    tooltip: 'Measure time from device restart to when it resumes forwarding traffic.',
  },
];

export function RFC2544Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: RFC2544SectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('rfc2544')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.rfc2544.title', 'RFC 2544 Tests')}</span>
          <span className="caption text-text-muted">({selectedCount}/6)</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Test Selection */}
        <div className="space-y-2">
          {RFC2544_TESTS.map((test) => (
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
            <RFC2544ConfigForm
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

export default RFC2544Section;
