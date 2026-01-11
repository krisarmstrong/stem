// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * RFC6349Section Component
 *
 * RFC 6349 TCP throughput methodology tests.
 * Includes: TCP Throughput (BDP analysis), Path Analysis.
 */

import { Activity } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type RFC6349Config, RFC6349ConfigForm } from '../../RFC6349ConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface RFC6349SectionProps extends TestSectionProps {
  config: RFC6349Config;
  onConfigChange: (config: RFC6349Config) => void;
}

const RFC6349_TESTS: TestDefinition[] = [
  {
    id: 'rfc6349_throughput',
    name: 'TCP Throughput',
    desc: 'BDP analysis',
    tooltip: 'Measure real TCP performance with Bandwidth-Delay Product optimization.',
  },
  {
    id: 'rfc6349_path',
    name: 'Path Analysis',
    desc: 'RTT/Bandwidth',
    tooltip: 'Characterize network path properties including RTT, loss, and capacity.',
  },
];

export function RFC6349Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: RFC6349SectionProps) {
  const { t } = useTranslation();

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('rfc6349')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.rfc6349.title', 'RFC 6349 TCP')}</span>
          <span className="caption text-text-muted">({selectedCount}/2)</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Test Selection */}
        <div className="space-y-2">
          {RFC6349_TESTS.map((test) => (
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
            <RFC6349ConfigForm
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

export default RFC6349Section;
