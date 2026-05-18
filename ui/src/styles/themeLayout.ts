/**
 * themeLayout.ts — icon sizing, radius, border, layout patterns.
 * Re-exported through theme.ts.
 */

/**
 * Icon sizing tokens
 */
export const icon = {
  size: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  },

  inline: 'inline-flex items-center gap-1.5',
  button: 'inline-flex items-center gap-2',
  leading: 'flex items-center gap-2',
} as const;

/**
 * Border radius scale
 */
export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

/**
 * Border tokens - consistent border styling
 */
export const border = {
  width: {
    none: 'border-0',
    default: 'border',
    thick: 'border-2',
  },

  color: {
    default: 'border-surface-border',
    focus: 'border-brand-primary',
    error: 'border-status-error',
    success: 'border-status-success',
    warning: 'border-status-warning',
  },

  card: 'border border-surface-border',
  input: 'border border-surface-border focus:border-brand-primary',
  divider: 'border-t border-surface-border',
} as const;

/**
 * Layout patterns
 */
export const layout = {
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center justify-center',
    wrap: 'flex flex-wrap',
  },

  grid: {
    cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    form2col: 'grid grid-cols-2 gap-2',
    data2col: 'grid grid-cols-2 gap-x-4 gap-y-2',
  },

  inline: {
    tight: 'flex items-center gap-1',
    default: 'flex items-center gap-2',
    comfortable: 'flex items-center gap-3',
    spacious: 'flex items-center gap-4',
    wrap: 'flex flex-wrap items-center gap-2',
  },

  stack: {
    tight: 'flex flex-col gap-1',
    default: 'flex flex-col gap-2',
    comfortable: 'flex flex-col gap-3',
    spacious: 'flex flex-col gap-4',
  },
} as const;
