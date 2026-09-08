/** @type {import('tailwindcss').Config} */
const config = {
  // ── This is the only critical addition ───────────────────
  // Tells Tailwind to activate dark: variants when
  // class="dark" is on <html>. Without this line,
  // ALL dark:bg-*, dark:text-* etc. in your components
  // are completely ignored by Tailwind.
  darkMode: 'class',

  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    // Added: ThemeContext and other context files need scanning too
    './contexts/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {},
  },

  plugins: [],
}

export default config