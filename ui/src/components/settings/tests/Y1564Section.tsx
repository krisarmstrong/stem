// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * Y1564Section Component
 *
 * ITU-T Y.1564 / EtherSAM service activation testing.
 * Includes: Configuration Test, Performance Test, Full Test.
 */

import { Activity } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type Y1564Config, Y1564ConfigForm } from '../../Y1564ConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface Y1564SectionProps extends TestSectionProps {
  config: Y1564Config;
  onConfigChange: (config: Y1564Config) => void;
}

/** Test ID to translation key mapping */
const TEST_KEYS = {
  y1564_config: 'config',
  y1564_perf: 'performance',
  y1564_full: 'full',
} as const;

const TEST_IDS = Object.keys(TEST_KEYS) as Array<keyof typeof TEST_KEYS>;

export function Y1564Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: Y1564SectionProps) {
  const { t } = useTranslation('settings');

  const tests: TestDefinition[] = useMemo(
    () =>
      TEST_IDS.map((id) => {
        const key = TEST_KEYS[id];
        return {
          id,
          name: t(`tests.y1564.${key}.name`),
          desc: t(`tests.y1564.${key}.desc`),
          tooltip: t(`tests.y1564.${key}.tooltip`),
        };
      }),
    [t],
  );

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('y1564')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.y1564.title', 'Y.1564 / EtherSAM')}</span>
          <span className="caption text-text-muted">({selectedCount}/3)</span>
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
            <Y1564ConfigForm
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

export default Y1564Section;
