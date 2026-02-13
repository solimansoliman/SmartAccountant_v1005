/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './types.ts',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        primary: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--brand-secondary-rgb) / <alpha-value>)',
        success: 'rgb(var(--brand-success-rgb) / <alpha-value>)',
        danger: 'rgb(var(--brand-danger-rgb) / <alpha-value>)',
        warning: 'rgb(var(--brand-warning-rgb) / <alpha-value>)',
      },
    },
  },
};
