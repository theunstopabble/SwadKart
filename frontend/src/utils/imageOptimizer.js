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

    // 🛡️ SECURITY FIX (CodeQL): Using strict array element matching instead of potential substring matches
    if (urlObj.hostname === "res.cloudinary.com") {
      const pathSegments = urlObj.pathname.split("/");

      const hasUpload = pathSegments.indexOf("upload") !== -1;
      if (hasUpload) {
        // Safe robust array check
        const hasQAuto = pathSegments.indexOf("q_auto") !== -1;
        const hasFAuto = pathSegments.indexOf("f_auto") !== -1;
        if (hasQAuto || hasFAuto) {
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
