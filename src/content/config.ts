import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    // Transform string to Date object
    pubDate: z.date(),
    updatedDate: z.date().optional(),
  }),
});

export const collections = { posts };
