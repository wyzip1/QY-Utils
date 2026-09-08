/*eslint-env node*/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{tsx,js,ts}"],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
};
