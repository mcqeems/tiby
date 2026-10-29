import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Gambar OpenGraph 1200x630: logo Tiby versi penuh (bukan logo-only)
// di latar putih, dirender oleh Next.js dari public/logo/logo.png.
export const runtime = "nodejs";
export const alt = "Tiby - Pendamping Cerdas Pengobatan TBC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo/logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <img src={src} height={300} alt="" />
      </div>
    ),
    { ...size },
  );
}
