import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

// Console wale screenshot se apna firebaseConfig yahan paste karein
// (analytics wali lines hata dein, zaroorat nahi)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7tDWOfi4iGWXBRl9xSbHFD4ie8fbL3vc",
  authDomain: "study-notes-ai-3d11e.firebaseapp.com",
  projectId: "study-notes-ai-3d11e",
  storageBucket: "study-notes-ai-3d11e.firebasestorage.app",
  messagingSenderId: "939397704310",
  appId: "1:939397704310:web:4c9942be6a240742168d57",
  measurementId: "G-B6YLNQ9L4Q"
};
const app = initializeApp(firebaseConfig);

self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN; // sirf local dev
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LcWTyguAAAAAGtHiqC66YzAGmfT_5w9ocrMTHgh"),
  isTokenAutoRefreshEnabled: true,
});

const ai = getAI(app, { backend: new GoogleAIBackend() });

export const deviceModel = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
});
export const cloudModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
});

export const privateModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_ON_DEVICE,
});

import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";

const rc = getRemoteConfig(app);
rc.settings.minimumFetchIntervalMillis = 60000;
rc.defaultConfig = {
  long_limit: 6000,
  summary_prompt: "Summarize these study notes in 5 short bullet points.",
};

export async function loadConfig() {
  try { await fetchAndActivate(rc); } catch (e) { console.log(e); }
  return {
    longLimit: getValue(rc, "long_limit").asNumber(),
    summaryPrompt: getValue(rc, "summary_prompt").asString(),
  };
}
