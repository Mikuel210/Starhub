import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  fonts: [{
    provider: fontProviders.fontsource(),
    name: "Poppins",
    cssVariable: "--font-main",
  }]
});
