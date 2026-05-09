import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import axios from "axios";
import { BASEURL } from "../config";

// Backend Base URL - Using dynamic config for devtunnels/production
const API_URL = `${BASEURL}/api/v1/biometric`;

/**
 * 🛠️ HELPER: Get Configured Axios (with Cookie-based Auth)
 * Uses HttpOnly cookies instead of Bearer tokens for security
 */
const getAxiosConfig = () => {
  return {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  };
};

/**
 * 🟢 REGISTER BIOMETRIC (Enable Fingerprint)
 * Flow:
 * 1. Pre-check device compatibility
 * 2. Get Options from Backend
 * 3. Trigger Browser Prompt (Fingerprint Scan)
 * 4. Send Scan Result to Backend
 */
export const registerBiometric = async () => {
  try {
    if (!window.PublicKeyCredential) {
      throw new Error("This browser doesn't support WebAuthn.");
    }

    const isAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!isAvailable) {
      throw new Error(
        "No fingerprint/biometric set up on this device. Please set up fingerprint in device settings first.",
      );
    }

    const config = getAxiosConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const resp = await axios.get(`${API_URL}/register/start`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let attResp;
    try {
      attResp = await startRegistration({ optionsJSON: resp.data });
    } catch (error) {
      if (error.name === "InvalidStateError") {
        throw new Error("Authenticator already registered.");
      }
      if (error.name === "NotAllowedError") {
        throw new Error("User cancelled or timeout. Please try again.");
      }
      if (error.name === "SecurityError") {
        throw new Error("Security error - check if site is HTTPS.");
      }
      throw new Error(error.message || "Fingerprint scan failed.");
    }

    const verificationController = new AbortController();
    const verifyTimeout = setTimeout(() => verificationController.abort(), 10000);
    const verificationResp = await axios.post(
      `${API_URL}/register/verify`,
      attResp,
      { ...config, signal: verificationController.signal },
    );
    clearTimeout(verifyTimeout);

    if (verificationResp.data.verified) {
      return true;
    } else {
      throw new Error("Verification failed on server");
    }
  } catch (error) {
    console.error("Biometric Register Error:", error);
    throw error;
  }
};

/**
 * 🔵 LOGIN/UNLOCK BIOMETRIC
 * Flow:
 * 1. Get Login Options
 * 2. Scan Fingerprint
 * 3. Verify
 */
export const authenticateBiometric = async () => {
  try {
    const config = getAxiosConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const resp = await axios.get(`${API_URL}/login/start`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const asseResp = await startAuthentication({ optionsJSON: resp.data });

    const verifyController = new AbortController();
    const verifyTimeout = setTimeout(() => verifyController.abort(), 10000);
    const verificationResp = await axios.post(
      `${API_URL}/login/verify`,
      asseResp,
      { ...config, signal: verifyController.signal },
    );
    clearTimeout(verifyTimeout);

    if (verificationResp.data.verified) {
      return true;
    } else {
      throw new Error("Unlock verification failed");
    }
  } catch (error) {
    console.error("Biometric Auth Error:", error);
    throw error;
  }
};
