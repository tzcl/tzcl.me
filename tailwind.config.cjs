/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      backgroundImage: {
        sky: "url('sky.jpg')",
      },
      fontFamily: {
        lora: ["Lora", "serif"],
      },
      fontSize: {
        title: "clamp(4em, 15vw + 1rem, 15em)",
      },
    },
  },
  plugins: [],
};
