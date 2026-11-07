import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "linger. — In-Person Social Discovery",
    short_name: "linger.",
    description:
      "Notice someone in the room? See tonight's 8s live looks, express identified interest, and match before the night ends.",
    start_url: "/",
    display: "standalone",
    background_color: "#2b0712",
    theme_color: "#2b0712",
    orientation: "portrait",
    categories: ["social", "lifestyle", "entertainment"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
