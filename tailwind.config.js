/** @type {import('tailwindcss').Config} */
export default {
  // Scoped to the training subdirectory so Tailwind utility classes don't
  // accidentally collide with the existing wizard CSS or antd styles.
  content: ['./src/training/**/*.{ts,tsx,js,jsx}'],
  // Disable preflight so the global resets don't break the rest of the app.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      // AI@RE CI — siehe doc/AIRE-CI-Manual.pdf. Zwei Kernfarben, eine Funktion
      // pro Farbe. Gold bleibt Akzent (CTA, Icon-Zentrum, einzelne
      // Hervorhebung) und nie Fläche > 15% einer Seite.
      colors: {
        // Markenfarben unter eigenen Namen für neuen Code.
        navy: {
          DEFAULT: '#0b2447',
          light: '#13294f',
          soft: '#23385c',
          deep: '#071a33',
        },
        gold: {
          DEFAULT: '#f2a93b',
          dark: '#d98f1f',
          soft: '#fbeddb',
        },
        cream: {
          DEFAULT: '#faf7f2',
          deep: '#f1eee5',
        },
        mist: {
          DEFAULT: '#e4e9f2',
          strong: '#cfd8e6',
        },
        // Die bestehenden Skalen des Training-Moduls werden auf die CI-Familien
        // umgelegt, damit `text-slate-800`, `bg-amber-50` usw. automatisch in
        // Markenfarben rendern. Nummerierung bleibt erhalten.
        slate: {
          50: '#faf7f2', // Cream
          100: '#f1eee5',
          200: '#e4e9f2', // Mist
          300: '#cfd8e6',
          400: '#8493a8',
          500: '#5b6b85', // Slate (Fliesstext)
          600: '#4d5c74',
          700: '#3c4a60',
          800: '#13294f', // Navy Light
          900: '#0b2447', // Navy
        },
        indigo: {
          50: '#f2f5fa',
          100: '#e4e9f2',
          300: '#b7c4da',
          400: '#7e8fac',
          500: '#23385c',
          600: '#1b3a66',
          700: '#13294f',
          800: '#0f2340',
          900: '#0b2447',
        },
        amber: {
          50: '#fdf6ea',
          100: '#fbeddb',
          200: '#f7ddb0',
          300: '#f5cf92',
          400: '#f2a93b', // AI@RE Gold
          500: '#f2a93b',
          600: '#d98f1f',
          700: '#b98a2e',
          800: '#8a5a00',
          900: '#5f3f10',
        },
        red: {
          50: '#fbefec',
          100: '#f7ddd7',
          200: '#f1cfc5',
          300: '#e4b0a4',
          400: '#d4907f',
          500: '#c2523c',
          600: '#b23f2c',
          700: '#b23f2c',
          800: '#93341f',
          900: '#7a3626',
        },
        emerald: {
          50: '#f2f8f0',
          100: '#e3f1de',
          300: '#a8cf9c',
          400: '#7fb471',
          500: '#4f8f42',
          600: '#3f7a34',
          700: '#3f7a34',
          800: '#33652b',
          900: '#2e5a26',
        },
      },
      fontFamily: {
        // Display/Wortmarke: Space Grotesk Bold. Fliesstext/UI: Inter.
        display: ['Space Grotesk', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
        sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      letterSpacing: {
        kicker: '0.1em',
      },
      boxShadow: {
        // Navy-getönte Tiefe statt neutralem Schwarz.
        sm: '0 1px 3px rgba(11, 36, 71, 0.06)',
        md: '0 6px 20px rgba(11, 36, 71, 0.08)',
        lg: '0 16px 40px rgba(11, 36, 71, 0.12)',
      },
      maxWidth: {
        prose: '70ch',
      },
    },
  },
  plugins: [],
}
