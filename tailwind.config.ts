import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#06061A', s1: '#0E0E26', s2: '#15153A', line: '#262654',
        sky: { DEFAULT: '#38BDF8' }, vio: '#8B5CF6', safe: '#2DD4BF', warn: '#F59E0B', err: '#F87171',
        ink: '#F8FAFC', mute: '#A1A6C8', lila: '#C4B5FD', indi: '#6366F1',
      },
      fontFamily: { display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '16px', xl3: '24px' },
      boxShadow: { soft: '0 20px 60px -20px rgba(0,0,0,.65)', glow: '0 0 0 1px rgba(139,92,246,.35), 0 12px 40px -10px rgba(139,92,246,.55)', glowSky: '0 0 0 1px rgba(56,189,248,.3), 0 10px 40px -10px rgba(56,189,248,.35)' },
    },
  },
  plugins: [],
} satisfies Config;
