// src/config/firebaseAdmin.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

let initialized = false;

if (!admin.apps.length) {
  if (!ENV.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.warn(
      "⚠️ No FIREBASE_SERVICE_ACCOUNT_PATH provided. Firebase Admin will not be initialized."
    );
  } else {
    try {
      const serviceAccountPath = path.resolve(
        __dirname,
        "..",
        "..",
        ENV.FIREBASE_SERVICE_ACCOUNT_PATH
      );

      const json = fs.readFileSync(serviceAccountPath, "utf8");
      const serviceAccount = JSON.parse(json) as admin.ServiceAccount;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "aistyling-app.appspot.com",   // ✅ CRITICAL FIX
      });

      initialized = true;
      console.log("✅ Firebase Admin initialized");
    } catch (err) {
      console.error(
        "❌ Failed to initialize Firebase Admin. Check FIREBASE_SERVICE_ACCOUNT_PATH and file contents.",
        err
      );
    }
  }
}

export const firebaseAdmin = admin;
export const firebaseAdminInitialized = initialized;
