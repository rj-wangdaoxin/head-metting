import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#2B2B28',
          soft: '#4A4A44',
          mute: '#5B5B52',
          wash: 'rgba(43,43,40,0.08)',
        },
        paper: {
          DEFAULT: '#F6F1E7',
          deep: '#EDE6D6',
          card: '#FFFDF7',
          line: '#DCD3BE',
        },
        cinnabar: {
          DEFAULT: '#9E3B2E',
          soft: '#B9584A',
          wash: 'rgba(158,59,46,0.10)',
        },
        indigo: {
          DEFAULT: '#35566B',
          soft: '#4C7189',
          wash: 'rgba(53,86,107,0.10)',
        },
        moss: '#4E7A51',
        gold: '#B8860B',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', 'SimSun', 'serif'],
        kai: ['"Kaiti SC"', 'KaiTi', 'STKaiti', '"Noto Serif SC"', 'serif'],
      },
      boxShadow: {
        scroll: '0 2px 4px rgba(43,43,40,0.05), 0 12px 28px -12px rgba(43,43,40,0.18)',
        scrollHover: '0 4px 10px rgba(43,43,40,0.08), 0 20px 38px -14px rgba(43,43,40,0.26)',
        seal: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 6px rgba(158,59,46,0.25)',
      },
      backgroundImage: {
        'paper-grain':
          "radial-gradient(circle at 18% 20%, rgba(158,59,46,0.05), transparent 38%), radial-gradient(circle at 82% 12%, rgba(53,86,107,0.06), transparent 42%), radial-gradient(circle at 50% 90%, rgba(184,134,11,0.05), transparent 45%)",
        'ink-gradient': 'linear-gradient(135deg, #2B2B28 0%, #4A4A44 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'seal-in': {
          '0%': { opacity: '0', transform: 'scale(0.85) rotate(-6deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'ink-spread': {
          '0%': { opacity: '0', filter: 'blur(6px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        blink: {
          '0%, 45%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'line-grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s ease-out both',
        'seal-in': 'seal-in 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
        'ink-spread': 'ink-spread 0.6s ease-out both',
        blink: 'blink 1s steps(1,end) infinite',
        'line-grow': 'line-grow 0.6s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
