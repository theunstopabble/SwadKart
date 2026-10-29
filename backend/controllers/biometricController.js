import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import prisma from "../config/prisma.js";
import { webAuthnConfig } from "../config/webauthnConfig.js";

/**
 * 🟢 STEP 1: GENERATE REGISTRATION OPTIONS
 */
export const registerBiometricStart = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userAuthenticators = Array.isArray(user.biometricCredentials)
      ? user.biometricCredentials
      : [];

    const options = await generateRegistrationOptions({
      rpName: webAuthnConfig.rpName,
      rpID: webAuthnConfig.rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      attestationType: "none",
      excludeCredentials: userAuthenticators.map((authenticator) => ({
        id: authenticator.credentialID,
        type: "public-key",
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "discouraged",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

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
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
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
        credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: credential.transports || [],
        deviceType: registrationInfo.credentialDeviceType || "singleDevice",
        backedUp: registrationInfo.credentialBackedUp || false,
      };

      const existingCreds = Array.isArray(user.biometricCredentials)
        ? user.biometricCredentials
        : [];

      await prisma.user.update({
        where: { id: user.id },
        data: {
          biometricCredentials: [...existingCreds, newAuthenticator],
          currentChallenge: null,
          isBiometricEnabled: true,
        },
      });

      res.status(200).json({ verified: true, message: "Biometric Registered!" });
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
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const auths = Array.isArray(user.biometricCredentials)
      ? user.biometricCredentials
      : [];
    if (auths.length === 0) {
      return res.status(400).json({
        message: "No biometric credentials found. Please register first.",
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: webAuthnConfig.rpID,
      allowCredentials: auths.map((cred) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "discouraged",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    res.status(200).json(options);
  } catch (error) {
    console.error("Biometric Login Start Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * 🔵 STEP 4: LOGIN VERIFY
 */
export const loginBiometricVerify = async (req, res) => {
  try {
    const { body } = req;
    const userId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const creds = Array.isArray(user.biometricCredentials)
      ? user.biometricCredentials
      : [];
    const authDoc = creds.find((cred) => cred.credentialID === body.id);

    if (!authDoc) {
      return res.status(400).json({ message: "Authenticator not registered" });
    }

    const credentialIDBuffer = Buffer.from(body.id, "base64url");
    const publicKeyBuffer = Buffer.from(authDoc.credentialPublicKey, "base64");

    const validCredential = {
      id: new Uint8Array([...credentialIDBuffer]),
      publicKey: new Uint8Array([...publicKeyBuffer]),
      counter: Number(authDoc.counter),
      transports: authDoc.transports,
    };

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: webAuthnConfig.origin,
        expectedRPID: webAuthnConfig.rpID,
        credential: validCredential,
        requireUserVerification: false,
      });
    } catch (error) {
      console.error("❌ Auth Verification Logic Failed:", error);
      return res.status(400).json({ message: error.message });
    }

    const { verified, authenticationInfo } = verification;

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: null },
    });

    if (!verified || !authenticationInfo) {
      return res.status(400).json({ verified: false, message: "Verification failed" });
    }

    // Update counter
    const updatedCreds = creds.map((c) =>
      c.credentialID === body.id ? { ...c, counter: authenticationInfo.newCounter } : c,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { biometricCredentials: updatedCreds },
    });

    res.status(200).json({ verified: true, message: "Unlocked Successfully!" });
  } catch (error) {
    console.error("Biometric Login Verify Error:", error);
    res.status(500).json({ message: error.message });
  }
};
