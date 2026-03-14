/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        dancing: ['"Dancing Script"', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
        merriweather: ['Merriweather', 'serif'],
        spartan: ['Spartan', 'sans-serif'],
      },
      transitionTimingFunction: {
        jump: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [],
};
