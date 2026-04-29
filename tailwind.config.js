/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // Safelist preserves Tailwind classes that are built dynamically at runtime
  // (e.g. the theme picker swaps accent colours based on a user setting),
  // so JIT can't see them in source and would otherwise purge them.
  safelist: [
    {
      pattern:
        /(bg|text|border|from|via|to|hover:bg|hover:border|focus:border)-(slate|zinc|stone|neutral|red|emerald|blue)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern:
        /(bg|border)-(slate|zinc|stone|neutral)-(700|800|900)\/(30|40|50|60|70)/,
    },
    {
      pattern: /text-(slate|zinc|stone)-(300|400)/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
