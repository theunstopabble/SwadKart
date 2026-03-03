export const optimizeImageUrl = (url) => {
  if (!url) return url;

  // Optimize Unsplash Images (append w=600, q=75, Auto WebP)
  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("w", "600");
      urlObj.searchParams.set("q", "75");
      urlObj.searchParams.set("fm", "webp");
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      return urlObj.toString();
    } catch (e) {
      return url; // fallback if invalid URL
    }
  }

  // Optimize Cloudinary Images (insert q_auto,f_auto,w_600 parameters into URL path)
  if (url.includes("res.cloudinary.com")) {
    if (url.includes("/upload/")) {
      // Avoid appending if already optimized
      if (url.includes("q_auto") || url.includes("f_auto")) return url;

      // Insert transformation parameters right after /upload/
      return url.replace("/upload/", "/upload/c_scale,w_600,f_auto,q_auto/");
    }
  }

  return url;
};
