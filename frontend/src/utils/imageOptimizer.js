export const optimizeImageUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  try {
    const urlObj = new URL(url);

    // 🛡️ SECURITY FIX (CodeQL): Exact Hostname Check
    if (urlObj.hostname === "images.unsplash.com") {
      urlObj.searchParams.set("w", "600");
      urlObj.searchParams.set("q", "75");
      urlObj.searchParams.set("fm", "webp");
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      return urlObj.toString();
    }

    // 🛡️ SECURITY FIX (CodeQL): Using Array splits instead of unsafe string.includes()
    if (urlObj.hostname === "res.cloudinary.com") {
      const pathSegments = urlObj.pathname.split("/");

      if (pathSegments.includes("upload")) {
        // Safe robust array check
        if (
          pathSegments.includes("q_auto") ||
          pathSegments.includes("f_auto")
        ) {
          return url;
        }

        // Insert transformations safely
        const uploadIndex = pathSegments.indexOf("upload");
        pathSegments.splice(uploadIndex + 1, 0, "c_scale,w_600,f_auto,q_auto");
        urlObj.pathname = pathSegments.join("/");
        return urlObj.toString();
      }
    }

    return url;
  } catch {
    return url;
  }
};
