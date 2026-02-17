import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page:     'rgb(var(--color-page) / <alpha-value>)',
        surface:  'rgb(var(--color-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
        hover:    'rgb(var(--color-hover) / <alpha-value>)',

        edge:          'rgb(var(--color-edge) / <alpha-value>)',
        'edge-strong': 'rgb(var(--color-edge-strong) / <alpha-value>)',

        heading: 'rgb(var(--color-heading) / <alpha-value>)',
        body:    'rgb(var(--color-body) / <alpha-value>)',
        muted:   'rgb(var(--color-muted) / <alpha-value>)',
        faint:   'rgb(var(--color-faint) / <alpha-value>)',

        positive:          'rgb(var(--color-positive) / <alpha-value>)',
        negative:          'rgb(var(--color-negative) / <alpha-value>)',
        warning:           'rgb(var(--color-warning) / <alpha-value>)',
        accent:            'rgb(var(--color-accent) / <alpha-value>)',

        'positive-surface': 'var(--surface-positive)',
        'negative-surface': 'var(--surface-negative)',
        'accent-surface':   'var(--surface-accent)',
      },
    },
  },
  plugins: [],
} satisfies Config;
