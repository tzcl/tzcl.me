module.exports = {
  plugins: [
    import("prettier-plugin-tailwindcss"),
    import("prettier-plugin-astro"),
  ],
  overrides: [
    {
      files: ["**/*.astro"],
      options: {
        parser: "astro",
      },
    },
  ],
};
