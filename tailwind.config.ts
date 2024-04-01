import tailwindForms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'
import type {Config} from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import defaultTheme from 'tailwindcss/defaultTheme.js'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: {
          DEFAULT: 'hsl(var(--input))',
          invalid: 'hsl(var(--input-invalid))',
        },
        ring: {
          DEFAULT: 'hsl(var(--ring))',
          invalid: 'hsl(var(--foreground-destructive))',
        },
        background: 'hsl(var(--background))',
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          destructive: 'hsl(var(--foreground-destructive))',
        },
        primary: {
          DEFAULT: 'var(--primary-500)',
          foreground: 'var(--foreground)',
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
        },
        secondary: {
          DEFAULT: 'var(--secondary-500)',
          foreground: 'var(--foreground)',
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
          700: 'var(--secondary-700)',
          800: 'var(--secondary-800)',
          900: 'var(--secondary-900)',
          950: 'var(--secondary-950)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        // 1rem = 16px
        /** 80px size / 84px high / bold */
        mega: ['5rem', {lineHeight: '5.25rem', fontWeight: '700'}],
        /** 56px size / 62px high / bold */
        h1: ['3.5rem', {lineHeight: '3.875rem', fontWeight: '700'}],
        /** 40px size / 48px high / bold */
        h2: ['2.5rem', {lineHeight: '3rem', fontWeight: '700'}],
        /** 32px size / 36px high / bold */
        h3: ['2rem', {lineHeight: '2.25rem', fontWeight: '700'}],
        /** 28px size / 36px high / bold */
        h4: ['1.75rem', {lineHeight: '2.25rem', fontWeight: '700'}],
        /** 24px size / 32px high / bold */
        h5: ['1.5rem', {lineHeight: '2rem', fontWeight: '700'}],
        /** 16px size / 20px high / bold */
        h6: ['1rem', {lineHeight: '1.25rem', fontWeight: '700'}],

        /** 32px size / 36px high / normal */
        'body-2xl': ['2rem', {lineHeight: '2.25rem'}],
        /** 28px size / 36px high / normal */
        'body-xl': ['1.75rem', {lineHeight: '2.25rem'}],
        /** 24px size / 32px high / normal */
        'body-lg': ['1.5rem', {lineHeight: '2rem'}],
        /** 20px size / 28px high / normal */
        'body-md': ['1.25rem', {lineHeight: '1.75rem'}],
        /** 16px size / 20px high / normal */
        'body-sm': ['1rem', {lineHeight: '1.25rem'}],
        /** 14px size / 18px high / normal */
        'body-xs': ['0.875rem', {lineHeight: '1.125rem'}],
        /** 12px size / 16px high / normal */
        'body-2xs': ['0.75rem', {lineHeight: '1rem'}],

        /** 18px size / 24px high / semibold */
        caption: ['1.125rem', {lineHeight: '1.5rem', fontWeight: '600'}],
        /** 12px size / 16px high / bold */
        button: ['0.75rem', {lineHeight: '1rem', fontWeight: '700'}],
      },
      keyframes: {
        'accordion-down': {
          from: {height: '0'},
          to: {height: 'var(--radix-accordion-content-height)'},
        },
        'accordion-up': {
          from: {height: 'var(--radix-accordion-content-height)'},
          to: {height: '0'},
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  presets: [
    {
      theme: {
        extend: {
          keyframes: {
            'roll-reveal': {
              from: {transform: 'rotate(12deg) scale(0)', opacity: '0'},
              to: {transform: 'rotate(0deg) scale(1)', opacity: '1'},
            },
            'slide-left': {
              from: {transform: 'translateX(20px)', opacity: '0'},
              to: {transform: 'translateX(0px)', opacity: '1'},
            },
            'slide-top': {
              from: {transform: 'translateY(20px)', opacity: '0'},
              to: {transform: 'translateY(0px)', opacity: '1'},
            },
          },
          animation: {
            'roll-reveal': 'roll-reveal 0.4s cubic-bezier(.22,1.28,.54,.99)',
            'slide-left': 'slide-left 0.3s ease-out',
            'slide-top': 'slide-top 0.3s ease-out',
          },
        },
      },
    },
  ],
  plugins: [animatePlugin, tailwindForms, typography],
} satisfies Config
