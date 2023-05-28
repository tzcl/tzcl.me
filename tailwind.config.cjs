const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      backgroundColor: {
        light: "#fffff8",
        dark: "#151515",
      },
      backgroundImage: {
        sky: "url('sky.jpg')",
        roof: "url('roof.jpg')",
      },
      fontFamily: {
        lora: ["Lora", ...defaultTheme.fontFamily.serif],
        georgia: ["Georgia", ...defaultTheme.fontFamily.serif],
      },
      fontSize: {
        title: "clamp(4em, 15vw + 1rem, 12em)",
      },
    },
  },
  plugins: [],
};
