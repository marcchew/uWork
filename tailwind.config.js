/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', 
    './src/**/*.{js,ts,jsx,tsx}',
    './src/views/**/*.{ejs,html}',
    './public/**/*.{js,html}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
