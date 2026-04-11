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
    // 0. PRE-CHECK: Verify device actually supports biometric
    console.log("🔐 Step 0: Pre-checking device capability...");

    if (!window.PublicKeyCredential) {
      throw new Error("This browser doesn't support WebAuthn.");
    }

    const isAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log("🔐 Platform authenticator available:", isAvailable);

    if (!isAvailable) {
      throw new Error(
        "No fingerprint/biometric set up on this device. Please set up fingerprint in device settings first.",
      );
    }

    // 1. Get Challenge from Server (Cookie-based auth)
    const config = getAxiosConfig();
    console.log("🔐 Step 1: Getting registration options from server...");
    const resp = await axios.get(`${API_URL}/register/start`, config);
    console.log("🔐 Step 1 SUCCESS: Got options", resp.data);

    // 2. Trigger Browser/Phone Prompt
    let attResp;
    try {
      console.log("🔐 Step 2: Triggering fingerprint scan...");
      attResp = await startRegistration({ optionsJSON: resp.data });
      console.log("🔐 Step 2 SUCCESS: Got attestation response");
    } catch (error) {
      console.error("🔐 Step 2 FAILED:", error.name, error.message);
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

    // 3. Send Result to Server
    console.log("🔐 Step 3: Verifying with server...");
    const verificationResp = await axios.post(
      `${API_URL}/register/verify`,
      attResp,
      config,
    );

    if (verificationResp.data.verified) {
      console.log("🔐 Step 3 SUCCESS: Biometric registered!");
      return true;
    } else {
      throw new Error("Verification failed on server");
    }
  } catch (error) {
    console.error("🔐 Biometric Register Error:", error);
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
    // 1. Get Challenge (Cookie-based auth)
    const config = getAxiosConfig();
    const resp = await axios.get(`${API_URL}/login/start`, config);

    // 2. Trigger Scan
    let asseResp;
    try {
      asseResp = await startAuthentication({ optionsJSON: resp.data });
    } catch (error) {
      throw error;
    }

    // 3. Verify
    const verificationResp = await axios.post(
      `${API_URL}/login/verify`,
      asseResp,
      config,
    );

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
