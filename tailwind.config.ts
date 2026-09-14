import type { Config } from 'tailwindcss';

// Club colours are defined as CSS variables in src/index.css (light + dark).
// To change the palette, edit only those variables.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
          soft: token('primary-soft'),
        },
        link: token('link'),
        background: token('background'),
        foreground: token('foreground'),
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        border: token('border'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        gold: token('gold'),
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem' },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
