/**
 * Sidebar navigation groups for The Stem.
 *
 * Tests are grouped under a single 'Tests' header (one entry per
 * module). Reflector is the default landing route. History lives at
 * the top level alongside it.
 */
import { Award, BarChart3, History, Repeat, Settings2, Waves, Zap } from 'lucide-react';
import type { SidebarNavGroup } from './ui/Sidebar';

export const navGroups: SidebarNavGroup[] = [
  {
    label: 'Mode',
    items: [{ path: '/reflector', label: 'Reflector', icon: Repeat }],
  },
  {
    label: 'Tests',
    items: [
      { path: '/tests/benchmark', label: 'Benchmark', icon: BarChart3 },
      { path: '/tests/servicetest', label: 'ServiceTest', icon: Settings2 },
      { path: '/tests/trafficgen', label: 'TrafficGen', icon: Zap },
      { path: '/tests/measure', label: 'Measure', icon: Waves },
      { path: '/tests/certify', label: 'Certify', icon: Award },
    ],
  },
  {
    label: 'History',
    items: [{ path: '/history', label: 'History', icon: History }],
  },
];
