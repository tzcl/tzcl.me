import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import remarkSidenotes from "remark-sidenotes";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://tzcl.me",
  markdown: {
    processor: unified({
      remarkPlugins: [remarkSidenotes],
    }),
    shikiConfig: {
      theme: "css-variables",
    },
  },
  integrations: [mdx(), sitemap(), icon()],
  vite: {
    plugins: [tailwind()],
  },
});
