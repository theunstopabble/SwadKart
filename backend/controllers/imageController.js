import sharp from "sharp";
import axios from "axios";
import path from "path";

// ============================================================
// 🖼️ SERVERLESS THUMBNAIL GENERATION (FEAT-17)
// ============================================================
// On-the-fly image resize endpoint with Sharp.
// Usage: GET /api/v1/upload/thumbnail?url=IMAGE_URL&w=300&h=200&q=80&fit=cover
//
// Enterprise features:
// - URL allowlist validation (prevents SSRF)
// - Max dimension caps (2048px)
// - Format auto-conversion (WebP preferred)
// - Cache-Control: 30 days
// ============================================================

const ALLOWED_HOSTS = [
  "res.cloudinary.com",
  "images.unsplash.com",
  "img.freepik.com",
  "placehold.co",
  "localhost",
  "b.zmtcdn.com",
  "assets.tmecosys.com",
  "data.thefeedfeed.com",
  "cdn.pixabay.com",
  "images.pexels.com",
];

const MAX_DIM = 2048;

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export const generateThumbnail = async (req, res) => {
  const { url, w = 300, h, q = 80, fit = "cover" } = req.query;

  if (!url) {
    return res.status(400).json({ message: "Missing 'url' query parameter" });
  }

  if (!isAllowedUrl(url)) {
    return res.status(403).json({ message: "URL not in allowlist" });
  }

  let width = Math.min(parseInt(w, 10) || 300, MAX_DIM);
  let height = h ? Math.min(parseInt(h, 10), MAX_DIM) : null;
  let quality = Math.min(parseInt(q, 10) || 80, 100);

  // Prevent zero/negative
  width = Math.max(1, width);
  if (height) height = Math.max(1, height);

  try {
    // Fetch image (timeout 10s, max 5MB)
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { "User-Agent": "SwadKart-ThumbnailBot/1.0" },
    });

    const inputBuffer = Buffer.from(response.data);

    // Determine output format from Accept header or default WebP
    const accept = req.headers.accept || "";
    const useWebP = accept.includes("image/webp");
    const format = useWebP ? "webp" : "jpeg";

    // Build Sharp pipeline
    let pipeline = sharp(inputBuffer).resize({
      width,
      height: height || undefined,
      fit,
      position: "center",
    });

    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
      res.set("Content-Type", "image/webp");
    } else {
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      res.set("Content-Type", "image/jpeg");
    }

    // Cache aggressively (30 days immutable)
    res.set("Cache-Control", "public, max-age=2592000, immutable");
    res.set("Vary", "Accept");

    const outputBuffer = await pipeline.toBuffer();
    return res.send(outputBuffer);
  } catch (err) {
    console.error("🖼️ Thumbnail error:", err.message);
    return res.status(500).json({ message: "Image processing failed" });
  }
};
