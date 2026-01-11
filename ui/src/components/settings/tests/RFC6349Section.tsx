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

/** Test ID to translation key mapping */
const TEST_KEYS = {
  rfc6349_throughput: 'capacity',
  rfc6349_path: 'path',
} as const;

const TEST_IDS = Object.keys(TEST_KEYS) as Array<keyof typeof TEST_KEYS>;

export function RFC6349Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: RFC6349SectionProps) {
  const { t } = useTranslation('settings');

  const tests: TestDefinition[] = useMemo(
    () =>
      TEST_IDS.map((id) => {
        const key = TEST_KEYS[id];
        return {
          id,
          name: t(`tests.rfc6349.${key}.name`),
          desc: t(`tests.rfc6349.${key}.desc`),
          tooltip: t(`tests.rfc6349.${key}.tooltip`),
        };
      }),
    [t],
  );

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
