// Import the glob loader
import { glob } from "astro/loaders";
// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";
// Define a `loader` and `schema` for each collection
const work = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: "./src/pages/work/entries" }),
    schema: ({ image }) => z.object({
      title: z.string(),
      description: z.string(),
      meta: z.string(),
      pubDate: z.date(),
      links: z.array(z.string()),
      image: image(),
      imgAlt:  z.string(),
      // Optional video (path under /public) shown as the hero in place of `image`;
      // `image` is still used for the /work thumbnail, the gallery strip, and OG.
      heroVideo: z.string().optional(),
      // Caption for the hero video's slide (last item in the gallery strip)
      heroVideoAlt: z.string().optional(),
      tags: z.array(z.string())
    })
});
// Export a single `collections` object to register your collection(s)
export const collections = { work };