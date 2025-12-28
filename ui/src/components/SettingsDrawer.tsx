import { X, Monitor, Zap, Network, Activity, Radio, Settings2, Cpu } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface InterfaceInfo {
  name: string;
  mac: string;
  speed: number;
  state: string;
  driver: string;
  physical: boolean;
  xdp: boolean;
  score: number;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reflector' | 'test_master';
  setMode: (mode: 'reflector' | 'test_master') => void;
  interfaces: InterfaceInfo[];
  selectedInterface: string;
  setSelectedInterface: (iface: string) => void;
  selectedTests: string[];
  setSelectedTests: (tests: string[]) => void;
  reflectorProfile: string;
  setReflectorProfile: (profile: string) => void;
}

export function SettingsDrawer({
  isOpen,
  onClose,
  mode,
  setMode,
  interfaces,
  selectedInterface,
  setSelectedInterface,
  selectedTests,
  setSelectedTests,
  reflectorProfile,
  setReflectorProfile,
}: SettingsDrawerProps) {
  if (!isOpen) return null;

  const toggleTest = (test: string) => {
    if (selectedTests.includes(test)) {
      setSelectedTests(selectedTests.filter(t => t !== test));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const maxScore = Math.max(...interfaces.map(i => i.score), 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 max-w-full bg-[var(--color-surface-raised)] border-l border-[var(--color-surface-border)] z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-surface-raised)] border-b border-[var(--color-surface-border)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Mode Selection */}
          <CollapsibleSection
            title={
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span>Mode</span>
              </div>
            }
            defaultOpen={true}
          >
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'reflector'}
                  onChange={() => setMode('reflector')}
                  className="w-4 h-4 accent-[var(--color-seed-green)]"
                />
                <div>
                  <div className="font-medium text-sm">Reflector Mode</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Packet reflection (Tier 1)</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'test_master'}
                  onChange={() => setMode('test_master')}
                  className="w-4 h-4 accent-[var(--color-seed-green)]"
                />
                <div>
                  <div className="font-medium text-sm">Test Master Mode</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Network testing (Tier 2)</div>
                </div>
              </label>
            </div>
          </CollapsibleSection>

          {/* Interface Selection */}
          <CollapsibleSection
            title={
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span>Interface</span>
              </div>
            }
            defaultOpen={true}
          >
            <div className="space-y-3">
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="w-full"
              >
                {interfaces.map(iface => (
                  <option key={iface.name} value={iface.name}>
                    {iface.name} ({iface.speed}Mbps)
                    {iface.score === maxScore && ' ★'}
                  </option>
                ))}
              </select>
              {interfaces.find(i => i.name === selectedInterface) && (
                <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                  <div>Driver: {interfaces.find(i => i.name === selectedInterface)?.driver}</div>
                  <div className="flex gap-2">
                    {interfaces.find(i => i.name === selectedInterface)?.xdp && (
                      <span className="status-badge success">XDP</span>
                    )}
                    {interfaces.find(i => i.name === selectedInterface)?.physical && (
                      <span className="status-badge success">Physical</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Test Master Tests */}
          {mode === 'test_master' && (
            <>
              {/* RFC 2544 Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>RFC 2544 Tests</span>
                    <span className="text-xs text-[var(--color-text-muted)]">({selectedTests.filter(t => t.startsWith('rfc2544')).length}/6)</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'rfc2544_throughput', name: 'Throughput', desc: 'Max rate with 0% loss' },
                    { id: 'rfc2544_latency', name: 'Latency', desc: 'Round-trip time' },
                    { id: 'rfc2544_frame_loss', name: 'Frame Loss', desc: 'Loss vs offered load' },
                    { id: 'rfc2544_back_to_back', name: 'Back-to-Back', desc: 'Burst capacity' },
                    { id: 'rfc2544_system_recovery', name: 'System Recovery', desc: 'Recovery after overload' },
                    { id: 'rfc2544_reset', name: 'Reset', desc: 'Device reset recovery' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Y.1564 Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Y.1564 / EtherSAM</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'y1564_config', name: 'Configuration Test', desc: 'Service config validation' },
                    { id: 'y1564_perf', name: 'Performance Test', desc: 'Sustained 15+ min test' },
                    { id: 'y1564_full', name: 'Full Test', desc: 'Both config and perf' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* RFC 2889 Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    <span>RFC 2889 LAN Switch</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'rfc2889_forwarding', name: 'Forwarding Rate', desc: 'Switch forwarding capacity' },
                    { id: 'rfc2889_caching', name: 'Address Caching', desc: 'MAC table capacity' },
                    { id: 'rfc2889_learning', name: 'Address Learning', desc: 'Learning rate' },
                    { id: 'rfc2889_broadcast', name: 'Broadcast', desc: 'Broadcast forwarding' },
                    { id: 'rfc2889_congestion', name: 'Congestion Control', desc: 'Backpressure handling' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* RFC 6349 Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>RFC 6349 TCP</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'rfc6349_throughput', name: 'TCP Throughput', desc: 'BDP analysis' },
                    { id: 'rfc6349_path', name: 'Path Analysis', desc: 'RTT/Bandwidth' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Y.1731 Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span>Y.1731 OAM</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'y1731_delay', name: 'Delay (DMM/DMR)', desc: 'Frame delay measurement' },
                    { id: 'y1731_loss', name: 'Loss (LMM/LMR)', desc: 'Frame loss measurement' },
                    { id: 'y1731_slm', name: 'Synthetic Loss', desc: 'SLM measurement' },
                    { id: 'y1731_loopback', name: 'Loopback', desc: 'LBM/LBR test' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* MEF Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span>MEF Service</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'mef_config', name: 'Configuration', desc: 'Service step test' },
                    { id: 'mef_perf', name: 'Performance', desc: 'Sustained test' },
                    { id: 'mef_full', name: 'Full Test', desc: 'Both phases' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>

              {/* TSN Tests */}
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    <span>TSN 802.1Qbv</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {[
                    { id: 'tsn_timing', name: 'Gate Timing', desc: 'GCL accuracy' },
                    { id: 'tsn_isolation', name: 'Traffic Isolation', desc: 'Class isolation' },
                    { id: 'tsn_latency', name: 'Scheduled Latency', desc: 'Deterministic delay' },
                    { id: 'tsn_full', name: 'Full Suite', desc: 'All TSN tests' },
                  ].map(test => (
                    <label key={test.id} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-seed-green)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{test.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Reflector Config */}
          {mode === 'reflector' && (
            <CollapsibleSection
              title={
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span>Reflector Profile</span>
                </div>
              }
              defaultOpen={true}
            >
              <div className="space-y-2">
                {[
                  { id: 'netally', name: 'NetAlly', desc: 'ITO signatures only' },
                  { id: 'msn', name: 'MSN', desc: 'Mustard Seed signatures' },
                  { id: 'all', name: 'All', desc: 'All signature types' },
                  { id: 'custom', name: 'Custom', desc: 'Manual configuration' },
                ].map(profile => (
                  <label key={profile.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
                    <input
                      type="radio"
                      name="profile"
                      checked={reflectorProfile === profile.id}
                      onChange={() => setReflectorProfile(profile.id)}
                      className="w-4 h-4 accent-[var(--color-seed-green)]"
                    />
                    <div>
                      <div className="font-medium text-sm">{profile.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{profile.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </>
  );
}

export default SettingsDrawer;
