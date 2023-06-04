import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

import remarkSectionize from "remark-sectionize";
import remarkSidenotes from "@tufte-markdown/remark-sidenotes";

// https://astro.build/config
export default defineConfig({
  site: "https://tzcl.me",
  markdown: {
    remarkPlugins: [remarkSectionize, remarkSidenotes],
  },
  integrations: [
    mdx(),
    sitemap(),
    tailwind({
      config: {
        // Disable injecting a basic `base.css` on every page
        applyBaseStyles: false,
      },
    }),
  ],
});
