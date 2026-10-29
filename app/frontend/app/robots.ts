import type { MetadataRoute } from "next";

const BASE_URL = "https://tiby.web.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Area aplikasi bersifat privat (di balik login) — tidak untuk diindeks.
        disallow: [
          "/admin/",
          "/nakes/",
          "/pasien/",
          "/pmo/",
          "/dashboard",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
