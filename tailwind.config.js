/** @type {import('tailwindcss').Config} */
export default {
  // Scoped to the training subdirectory so Tailwind utility classes don't
  // accidentally collide with the existing wizard CSS or antd styles.
  content: ['./src/training/**/*.{ts,tsx,js,jsx}'],
  // Disable preflight so the global resets don't break the rest of the app.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        prose: '70ch',
      },
    },
  },
  plugins: [],
}
