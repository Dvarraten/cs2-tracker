/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|text|border|from|via|to|hover:bg|hover:border|focus:border)-(slate|zinc|stone|neutral|red|emerald|blue)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /(bg|border)-(slate|zinc|stone|neutral)-(700|800|900)\/(30|40|50|60|70)/,
    },
    {
      pattern: /text-(slate|zinc|stone)-(300|400)/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}