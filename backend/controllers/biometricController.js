import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import User from "../models/userModel.js";
import { webAuthnConfig } from "../config/webauthnConfig.js";

/**
 * 🟢 STEP 1: GENERATE REGISTRATION OPTIONS
 */
export const registerBiometricStart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userAuthenticators = user.biometricCredentials || [];

    console.log("🔐 Generating registration options for:", user.email);
    console.log("🔐 WebAuthn Config:", webAuthnConfig);

    const options = await generateRegistrationOptions({
      rpName: webAuthnConfig.rpName,
      rpID: webAuthnConfig.rpID,
      userID: new Uint8Array(Buffer.from(user._id.toString())),
      userName: user.email,
      attestationType: "none",
      excludeCredentials: userAuthenticators.map((authenticator) => ({
        id: authenticator.credentialID,
        type: "public-key",
      })),
      // Relaxed requirements for maximum compatibility
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "discouraged", // 👈 Changed from 'preferred' to fix Android issues
      },
    });

    console.log("🔐 Options generated successfully, challenge:", options.challenge.substring(0, 20) + "...");

    user.currentChallenge = options.challenge;
    await user.save();
    res.status(200).json(options);
  } catch (error) {
    console.error("Biometric Reg Start Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * 🟢 STEP 2: VERIFY REGISTRATION
 */
export const registerBiometricVerify = async (req, res) => {
  try {
    const { body } = req;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const expectedChallenge = user.currentChallenge;

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: webAuthnConfig.origin,
        expectedRPID: webAuthnConfig.rpID,
      });
    } catch (error) {
      console.error("❌ Verification Logic Failed:", error);
      return res.status(400).json({ message: error.message });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;
      const newAuthenticator = {
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || [],
        deviceType: registrationInfo.credentialDeviceType || "singleDevice",
        backedUp: registrationInfo.credentialBackedUp || false,
      };

      user.biometricCredentials.push(newAuthenticator);
      user.currentChallenge = "";
      await user.save();
      res
        .status(200)
        .json({ verified: true, message: "Biometric Registered!" });
    } else {
      res.status(400).json({ verified: false, message: "Verification failed" });
    }
  } catch (error) {
    console.error("Biometric Reg Verify Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * 🔵 STEP 3: LOGIN START
 */
export const loginBiometricStart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("🔓 Login Start Request for:", user.email);

    const options = await generateAuthenticationOptions({
      rpID: webAuthnConfig.rpID,
      allowCredentials: user.biometricCredentials.map((cred) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "discouraged", // 👈 Matched with registration settings
    });

    user.currentChallenge = options.challenge;
    await user.save();
    res.status(200).json(options);
  } catch (error) {
    console.error("Biometric Login Start Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * 🔵 STEP 4: LOGIN VERIFY (🛠️ ROBUST MANUAL FIX)
 */
export const loginBiometricVerify = async (req, res) => {
  try {
    const { body } = req;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("🔍 Verifying Login for:", user.email);

    // Find the specific credential in Mongoose
    const authDoc = user.biometricCredentials.find(
      (cred) => cred.credentialID === body.id,
    );

    if (!authDoc) {
      return res.status(400).json({ message: "Authenticator not registered" });
    }

    // 🛠️ MANUAL MAPPING: Extracting raw values directly to avoid Mongoose issues
    // AuthenticatorDevice type requires Uint8Array for both ID and PublicKey
    const manualAuthenticator = {
      credentialID: new Uint8Array(Buffer.from(authDoc.credentialID, 'base64url')), // 👈 Convert String to Buffer
      credentialPublicKey: new Uint8Array(authDoc.credentialPublicKey),
      counter: Number(authDoc.counter),
      transports: authDoc.transports || [],
    };

    console.log("🛠️ Auth Object Prepared:", {
       idType: manualAuthenticator.credentialID.constructor.name,
       keyType: manualAuthenticator.credentialPublicKey.constructor.name,
       counter: manualAuthenticator.counter
    });

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: webAuthnConfig.origin,
        expectedRPID: webAuthnConfig.rpID,
        authenticator: manualAuthenticator, // Passing the manually mapped object
      });
    } catch (error) {
      console.error("❌ Auth Verification Logic Failed:", error);
      return res.status(400).json({ message: error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update counter
      authDoc.counter = authenticationInfo.newCounter;
      user.currentChallenge = "";
      user.markModified("biometricCredentials");
      await user.save();

      res
        .status(200)
        .json({ verified: true, message: "Unlocked Successfully!" });
    } else {
      res.status(400).json({ verified: false, message: "Verification failed" });
    }
  } catch (error) {
    console.error("Biometric Login Verify Error:", error);
    res.status(500).json({ message: error.message });
  }
};
