import { twMerge } from 'tailwind-merge';

/**
 * =============================================================================
 * THE STEM DESIGN SYSTEM - Mustard Seed Networks
 * =============================================================================
 *
 * Centralized design tokens and utilities for consistent UI across the app.
 *
 * ARCHITECTURE:
 * 1. CSS Variables (index.css) - Core color tokens for light/dark modes
 * 2. This file (theme.ts) - TypeScript tokens and utility functions
 * 3. Tailwind Classes - CSS-first configuration using @theme directive
 *
 * BRAND COLORS:
 * - Primary: Stem Green (#2d7a3e / #81c784 dark) - Actions, links, focus states
 * - Accent: Lighter Stem Green (#4caf50 / #a5d6a7 dark) - Hover states
 *
 * STATUS COLORS (Industry Standard):
 * - Success: Green (#28a745) - Positive states
 * - Warning: Amber (#ffc107) - Caution states
 * - Error: Red (#dc3545) - Error/danger states
 * - Info: Cyan (#17a2b8) - Informational states
 *
 * =============================================================================
 */

// ============================================================================
// SPACING SCALE
// ============================================================================

/**
 * Spacing scale - based on 4px grid
 * Use these semantic spacing utilities for consistency.
 */
export const spacing = {
  // Semantic CSS utility classes
  stack: {
    xs: 'stack-xs', // 4px vertical
    sm: 'stack-sm', // 8px vertical
    default: 'stack', // 12px vertical
    lg: 'stack-lg', // 16px vertical
    xl: 'stack-xl', // 24px vertical
  },

  section: {
    default: 'section-gap', // 24px between sections
  },

  gap: {
    tight: 'gap-tight', // 4px
    compact: 'gap-compact', // 8px
    default: 'gap-default', // 12px
    comfortable: 'gap-comfortable', // 16px
    spacious: 'gap-spacious', // 24px
  },

  pad: {
    xs: 'pad-xs', // 8px
    sm: 'pad-sm', // 12px
    default: 'pad', // 16px
    lg: 'pad-lg', // 24px
    xl: 'pad-xl', // 32px
  },

  // Chip/pill padding
  chip: {
    sm: 'px-3 py-1',
    md: 'px-3 py-1.5',
    lg: 'px-3 py-2',
  },

  // Tab button padding
  tab: 'py-2.5 px-3',

  margin: {
    bottom: {
      section: 'mb-6', // 24px
      heading: 'mb-3', // 12px
      content: 'mb-4', // 16px
      inline: 'mb-2', // 8px
    },
    top: {
      section: 'mt-8', // 32px
      content: 'mt-4', // 16px
      heading: 'mt-3', // 12px
    },
    left: {
      spacious: 'ml-6', // 24px
      comfortable: 'ml-4', // 16px
    },
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  heading: {
    h1: 'heading-1',
    h2: 'heading-2',
    h3: 'heading-3',
    h4: 'heading-4',
    section: 'section-title',
  },

  body: {
    large: 'body-large',
    default: 'body',
    small: 'body-small',
    caption: 'caption',
  },

  label: 'label',
  code: 'code',

  size: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  },

  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
} as const;

// ============================================================================
// COMPONENT VARIANTS
// ============================================================================

/**
 * Button variants
 */
export const button = {
  base: 'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed',

  variant: {
    primary: 'bg-brand-primary text-text-inverse hover:bg-brand-accent',
    secondary: 'border border-surface-border bg-surface-raised hover:bg-surface-hover',
    ghost: 'hover:bg-surface-hover',
    danger: 'bg-status-error text-text-inverse hover:opacity-90',
    success: 'bg-status-success text-text-inverse hover:opacity-90',
  },

  size: {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  },
} as const;

/**
 * Card variants
 */
export const card = {
  base: 'rounded-lg border bg-surface-raised',

  variant: {
    default: 'border-surface-border',
    elevated: 'border-surface-border shadow-lg',
    interactive:
      'border-surface-border hover:border-brand-primary cursor-pointer transition-colors',
  },

  padding: {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  },
} as const;

/**
 * Badge variants
 */
export const badge = {
  base: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',

  variant: {
    default: 'bg-surface-hover text-text-primary',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-status-warning/10 text-status-warning',
    error: 'bg-status-error/10 text-status-error',
    info: 'bg-status-info/10 text-status-info',
    primary: 'bg-brand-primary/10 text-brand-primary',
  },
} as const;

/**
 * Alert/Banner variants
 */
export const alert = {
  base: 'px-4 py-3 rounded-lg border',

  variant: {
    error: 'bg-status-error/10 border-status-error/20 text-status-error',
    warning: 'bg-status-warning/10 border-status-warning/20 text-status-warning',
    success: 'bg-status-success/10 border-status-success/20 text-status-success',
    info: 'bg-status-info/10 border-status-info/20 text-status-info',
  },
} as const;

/**
 * Modal/Dialog variants
 */
export const modal = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center p-4',
  backdrop: 'absolute inset-0 bg-black/50 backdrop-blur-sm',
  content:
    'bg-surface-raised border border-surface-border rounded-lg shadow-xl max-h-[85vh] overflow-y-auto',

  size: {
    sm: 'max-w-md w-full',
    md: 'max-w-2xl w-full',
    lg: 'max-w-4xl w-full',
    xl: 'max-w-6xl w-full',
  },
} as const;

// ============================================================================
// ICON SIZING
// ============================================================================

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

// ============================================================================
// BORDER & RADIUS
// ============================================================================

export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Combine class names with Tailwind class conflict resolution.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}

/**
 * Build a button class string
 */
export function buttonClass(
  variant: keyof typeof button.variant = 'primary',
  size: keyof typeof button.size = 'md',
  className?: string,
): string {
  return cn(button.base, button.variant[variant], button.size[size], className);
}

/**
 * Build a card class string
 */
export function cardClass(
  variant: keyof typeof card.variant = 'default',
  padding: keyof typeof card.padding = 'md',
  className?: string,
): string {
  return cn(card.base, card.variant[variant], card.padding[padding], className);
}

/**
 * Build a badge class string
 */
export function badgeClass(
  variant: keyof typeof badge.variant = 'default',
  className?: string,
): string {
  return cn(badge.base, badge.variant[variant], className);
}
