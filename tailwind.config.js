/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
