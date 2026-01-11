// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * RFC2889Section Component
 *
 * RFC 2889 LAN switch benchmarking tests.
 * Includes: Forwarding Rate, Address Caching, Learning, Broadcast, Congestion Control.
 */

import { Cpu } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../CollapsibleSection';
import { type RFC2889Config, RFC2889ConfigForm } from '../../RFC2889ConfigForm';
import { TestCheckbox } from '../TestCheckbox';
import type { TestDefinition, TestSectionProps } from '../types';

interface RFC2889SectionProps extends TestSectionProps {
  config: RFC2889Config;
  onConfigChange: (config: RFC2889Config) => void;
}

/** Test ID to translation key mapping */
const TEST_KEYS = {
  rfc2889_forwarding: 'forwarding',
  rfc2889_caching: 'caching',
  rfc2889_learning: 'learning',
  rfc2889_broadcast: 'broadcast',
  rfc2889_congestion: 'congestion',
} as const;

const TEST_IDS = Object.keys(TEST_KEYS) as Array<keyof typeof TEST_KEYS>;

export function RFC2889Section({
  selectedTests,
  onToggleTest,
  config,
  onConfigChange,
}: RFC2889SectionProps) {
  const { t } = useTranslation('settings');

  const tests: TestDefinition[] = useMemo(
    () =>
      TEST_IDS.map((id) => {
        const key = TEST_KEYS[id];
        return {
          id,
          name: t(`tests.rfc2889.${key}.name`),
          desc: t(`tests.rfc2889.${key}.desc`),
          tooltip: t(`tests.rfc2889.${key}.tooltip`),
        };
      }),
    [t],
  );

  const selectedCount = useMemo(
    () => selectedTests.filter((test) => test.startsWith('rfc2889')).length,
    [selectedTests],
  );

  const hasSelectedTests = selectedCount > 0;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" aria-hidden="true" />
          <span>{t('settings.tests.rfc2889.title', 'RFC 2889 LAN Switch')}</span>
          <span className="caption text-text-muted">({selectedCount}/5)</span>
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
            <RFC2889ConfigForm
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

export default RFC2889Section;
