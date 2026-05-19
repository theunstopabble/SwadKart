import { useState, useEffect, useCallback } from "react";

/**
 * Breakpoints from Requirement 13:
 *   - Mobile:  width < 640px → full-screen overlay (100vw × 100vh)
 *   - Tablet:  640px ≤ width < 1024px → bottom-right panel (480px wide, 70vh tall)
 *   - Desktop: width ≥ 1024px → bottom-right panel (420px wide, 600px tall)
 *
 * Landscape constraint (Requirement 13.4):
 *   - height < 500px → hide past-conversations panel, message list fills content height
 *
 * Maximize/Restore (Requirements 13.5, 13.6):
 *   - Maximize overrides to 100vw × 100vh on tablet/desktop
 *   - Restore returns to the breakpoint-defined size
 */

/**
 * Determine the layout band from viewport dimensions.
 * @param {number} width - Viewport width in pixels
 * @returns {"mobile" | "tablet" | "desktop"}
 */
export function resolveLayout(width) {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Determine if the viewport is in a constrained landscape mode.
 * @param {number} height - Viewport height in pixels
 * @returns {boolean}
 */
export function isLandscapeConstrained(height) {
  return height < 500;
}

/**
 * Compute the widget style object for a given layout and maximize state.
 * @param {"mobile" | "tablet" | "desktop"} layout
 * @param {boolean} isMaximized
 * @returns {object} CSS style object for the widget container
 */
function computeWidgetStyle(layout, isMaximized) {
  // Full-screen for mobile or maximized state
  if (layout === "mobile" || isMaximized) {
    return {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      bottom: "auto",
      right: "auto",
    };
  }

  if (layout === "tablet") {
    return {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "480px",
      height: "70vh",
      top: "auto",
      left: "auto",
    };
  }

  // Desktop
  return {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "420px",
    height: "600px",
    top: "auto",
    left: "auto",
  };
}

/**
 * Hook for responsive chat widget layout.
 *
 * Uses window resize events to determine the current layout band
 * and compute appropriate widget styles.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 *
 * @returns {{
 *   layout: "mobile" | "tablet" | "desktop",
 *   widgetStyle: object,
 *   isMaximized: boolean,
 *   isLandscape: boolean,
 *   toggleMaximize: () => void,
 * }}
 */
export function useResponsiveWidget() {
  const [layout, setLayout] = useState(() =>
    resolveLayout(window.innerWidth),
  );
  const [isLandscape, setIsLandscape] = useState(() =>
    isLandscapeConstrained(window.innerHeight),
  );
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    function handleResize() {
      const newLayout = resolveLayout(window.innerWidth);
      setLayout(newLayout);
      setIsLandscape(isLandscapeConstrained(window.innerHeight));

      // Reset maximize state if viewport shrinks to mobile
      if (newLayout === "mobile") {
        setIsMaximized(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * Toggle maximize/restore state.
   * Only applicable on tablet and desktop layouts.
   */
  const toggleMaximize = useCallback(() => {
    if (layout === "mobile") return; // Mobile is always full-screen
    setIsMaximized((prev) => !prev);
  }, [layout]);

  const widgetStyle = computeWidgetStyle(layout, isMaximized);

  return {
    layout,
    widgetStyle,
    isMaximized,
    isLandscape,
    toggleMaximize,
  };
}
