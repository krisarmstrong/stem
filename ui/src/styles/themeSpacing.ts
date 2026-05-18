/**
 * themeSpacing.ts — margin/padding/gap/stack tokens.
 * Re-exported through theme.ts.
 */

/**
 * Spacing scale - based on 4px grid
 * Use these semantic spacing utilities for consistency.
 */
export const spacing = {
  stack: {
    xs: 'stack-xs',
    sm: 'stack-sm',
    default: 'stack',
    lg: 'stack-lg',
    xl: 'stack-xl',
  },

  section: {
    default: 'section-gap',
  },

  gap: {
    tight: 'gap-tight',
    compact: 'gap-compact',
    default: 'gap-default',
    comfortable: 'gap-comfortable',
    spacious: 'gap-spacious',
  },

  pad: {
    xs: 'pad-xs',
    sm: 'pad-sm',
    default: 'pad',
    lg: 'pad-lg',
    xl: 'pad-xl',
  },

  chip: {
    sm: 'px-3 py-1',
    md: 'px-3 py-1.5',
    lg: 'px-3 py-2',
  },

  tab: 'py-2.5 px-3',

  inline: {
    xs: 'inline-gap-xs',
    sm: 'inline-gap-sm',
    default: 'inline-gap',
    lg: 'inline-gap-lg',
  },

  margin: {
    bottom: {
      section: 'mb-section',
      sectionLg: 'mb-section-lg',
      heading: 'mb-heading',
      content: 'mb-content',
      inline: 'mb-2',
      tight: 'mb-tight',
    },
    top: {
      section: 'mt-section',
      content: 'mt-content',
      heading: 'mt-heading',
      inline: 'mt-inline',
      tight: 'mt-tight',
    },
    left: {
      tight: 'ml-tight',
      inline: 'ml-inline',
      content: 'ml-content',
      spacious: 'ml-spacious',
    },
  },

  padding: {
    top: {
      heading: 'pt-heading',
      section: 'pt-section',
      tight: 'pt-tight',
    },
    bottom: {
      inline: 'pb-inline',
      tight: 'pb-tight',
    },
    right: {
      icon: 'pr-icon',
      tight: 'pr-tight',
    },
  },

  centered: 'py-centered',

  badge: {
    xs: 'p-badge-xs',
    sm: 'p-badge-sm',
    padXs: 'badge-pad-xs',
  },

  compact: {
    py: 'py-compact',
    pyMd: 'py-compact-md',
  },

  row: {
    py: 'py-row',
    pyLg: 'py-row-lg',
  },

  iconBtn: {
    sm: 'p-icon-btn',
    md: 'p-icon-btn-md',
  },

  mainPadding: {
    y: 'main-padding-y',
    x: 'content-padding-x',
  },

  drawerPad: 'drawer-content-pad',

  indent: 'pl-6',
} as const;
