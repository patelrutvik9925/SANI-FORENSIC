/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#070b14',         // Deepest background
          card: '#0d1322',       // Card / surface background
          cardHover: '#131b2e',  // Card hover
          border: '#1a243b',     // Subtle border
          borderLight: '#2a3b5c',
          text: '#e2e8f0',       // High contrast primary text
          muted: '#94a3b8',      // Muted secondary text
          darkMuted: '#64748b',
          accent: '#06b6d4',     // Cyber cyan accent
          accentHover: '#0891b2',
          blue: '#3b82f6',       // Electric blue
          emerald: '#10b981',    // Success / safe
          amber: '#f59e0b',      // Warning / attention
          rose: '#f43f5e',       // Danger / destructive
          purple: '#8b5cf6',     // Forensic evidence
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
