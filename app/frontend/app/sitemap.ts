import type { MetadataRoute } from "next";

const BASE_URL = "https://tiby.web.id";

// Hanya halaman publik yang masuk sitemap. Halaman area aplikasi
// (dashboard, admin, nakes, pasien, pmo) privat dan dikecualikan
// juga lewat robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
