# Study Notes Summarizer

Live demo: https://study-notes-ai-pi.vercel.app

Built for the #BuildHybridAI 2026 hackathon with **Firebase AI Logic hybrid inference**.

## What it does

Students paste their notes, or add a photo of them, and get a summary, a tap-to-answer quiz, flashcards or a simple explanation, in English or Hindi.

## Value proposition

Study notes are personal. Where a local model exists, the app can keep them on the device. Where it does not, the cloud fallback keeps the app working, so one codebase works on every device.

## How Firebase AI Logic is used

- src/firebase.js creates three models with getGenerativeModel: PREFER_ON_DEVICE (Auto), ONLY_ON_DEVICE (Private) and ONLY_IN_CLOUD (Cloud).
- src/App.jsx calls initializeDeviceModel() after a button click, then generateContent() or generateContentStream().
- Short notes and photos go to the hybrid model, very long notes (limit from Remote Config) go straight to the cloud.
- The badge shows where each answer was generated, read from the response inferenceSource.
- The long-note limit and the summary prompt are read from Firebase Remote Config, with defaults in the app.
- Firebase App Check (Fraud Defense / reCAPTCHA Enterprise) protects the AI API.

## Features

- Photo of notes (resized in the browser, then read by the model)
- Four modes: Summary, Quiz, Flashcards, Explain simply
- Interactive quiz: the model returns JSON, the app turns it into tappable questions with a score
- Streaming answers
- English and Hindi output
- Read aloud (browser speech synthesis), Copy, local history of the last 5 results

## Privacy modes

- Auto: on-device first, cloud as fallback.
- Private: runs only on the device. If no on-device model is available (for example on Android Chrome), the app refuses to run and sends nothing to the cloud.
- Cloud: always uses the cloud model.

## Testing notes

On-device inference needs Chrome on Desktop (v139+). The author built and tested the app on an Android phone and the deployed site, so the cloud path and the Private-mode refusal were tested there. The on-device path itself has not been tested by the author on a desktop.

## Run locally

1. Create a Firebase project, enable AI Logic (Gemini Developer API) and register a web app.
2. Put your own firebaseConfig and reCAPTCHA Enterprise site key in src/firebase.js.
3. Register the app in Firebase App Check and add a debug token.
4. Create a file named .env.local with this line:

        VITE_APPCHECK_DEBUG_TOKEN=your-debug-token

5. Create Remote Config parameters long_limit (Number, 6000) and summary_prompt (String).
6. Install and start:

        npm install
        npm run dev

## Tech stack

React, Vite, Firebase AI Logic, Firebase App Check, Firebase Remote Config, Gemini Developer API, Vercel.

## License

Apache License 2.0
