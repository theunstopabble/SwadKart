import sharp from "sharp";
import axios from "axios";
import path from "path";
import dns from "dns/promises";
import net from "net";

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
  "placehold.co",
  "b.zmtcdn.com",
  "assets.tmecosys.com",
  "data.thefeedfeed.com",
  "cdn.pixabay.com",
  "images.pexels.com",
];

const MAX_DIM = 2048;

function isPrivateIP(ip) {
  if (!net.isIPv4(ip)) return true;
  const parts = ip.split(".").map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.includes(parsed.hostname);
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

  // Enforce HTTPS-only
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      return res.status(403).json({ message: "HTTPS only" });
    }
  } catch {
    return res.status(400).json({ message: "Invalid URL" });
  }

  // DNS resolve + private IP check (prevents DNS rebinding SSRF)
  try {
    const addresses = await dns.resolve4(parsedUrl.hostname);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        console.error(`🚫 SSRF blocked: ${parsedUrl.hostname} resolved to private IP ${addr}`);
        return res.status(403).json({ message: "URL not allowed" });
      }
    }
  } catch {
    return res.status(403).json({ message: "URL resolution failed" });
  }

  let width = Math.min(Number.parseInt(w, 10) || 300, MAX_DIM);
  let height = h ? Math.min(Number.parseInt(h, 10) || 300, MAX_DIM) : null;
  let quality = Math.min(Number.parseInt(q, 10) || 80, 100);

  if (Number.isNaN(width)) width = 300;
  if (Number.isNaN(height)) height = null;
  if (Number.isNaN(quality)) quality = 80;

  // Prevent zero/negative
  width = Math.max(1, width);
  if (height) height = Math.max(1, height);

  try {
    // Fetch image (timeout 10s, max 5MB, up to 3 redirects)
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      maxRedirects: 3,
      beforeRedirect: (redirectedReq) => {
        try {
          const targetUrl = new URL(redirectedReq.headers?.location || redirectedReq.href || url);
          if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
            throw new Error("Redirect target not in allowlist");
          }
        } catch (err) {
          if (err.message === "Redirect target not in allowlist") throw err;
          throw new Error("Invalid redirect URL");
        }
      },
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
