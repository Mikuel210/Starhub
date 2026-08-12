import { defineConfig, fontProviders } from "astro/config";
import icon from "astro-icon";

export default defineConfig({
    fonts: [
        {
            provider: fontProviders.fontsource(),
            name: "Azeret Mono",
            cssVariable: "--font-main"
        },
    ],

    integrations: [icon()]
});
