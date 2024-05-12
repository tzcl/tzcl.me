import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import remarkSidenotes from "remark-sidenotes";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://tzcl.me",
  markdown: {
    remarkPlugins: [remarkSidenotes],
    shikiConfig: {
      theme: "css-variables"
    }
  },
  integrations: [mdx(), sitemap(), tailwind({
    // Disable injecting a basic `base.css` on every page
    applyBaseStyles: false
  }), icon()]
});