# Study Notes Summarizer

A study-notes summarizer built for the #BuildHybridAI 2026 hackathon with
**Firebase AI Logic hybrid inference**.

Short notes are sent to the on-device model (Gemini Nano in Chrome) when it is
available: private, free and works offline. Long notes, or devices without a
local model, automatically use the cloud model.

Live demo: https://study-notes-ai-pi.vercel.app

## Value proposition

Students paste their notes and get a 5-point summary. Short notes stay on the
device for privacy. Long notes still work through the cloud, so the app behaves
the same on every device.

## How Firebase AI Logic is used

- `src/firebase.js` creates two models with `getGenerativeModel`:
  `InferenceMode.PREFER_ON_DEVICE` and `InferenceMode.ONLY_IN_CLOUD`.
- `src/App.jsx` picks the model by note length (limit 6000 characters),
  calls `initializeDeviceModel()` after the button click, then
  `generateContent()`.
- The UI badge shows whether the answer came from the device or the cloud.
- Firebase App Check (Fraud Defense / reCAPTCHA Enterprise) protects the AI API.

## Features
- Photo of notes: take or upload a picture and the app reads it (JPEG/PNG, resized in the browser)
- Four modes: Summary, Quiz, Flashcards, Explain simply
- English and Hindi output
- Copy button and a local history of the last 5 results

- Paste notes, get a 5-bullet summary
- Hybrid routing: on-device first, cloud fallback
- Badge that shows where the summary was generated
- Works in mobile and desktop browsers

## Privacy modes

- Auto: on-device first, cloud fallback (PREFER_ON_DEVICE)
- Private: only on the device (ONLY_ON_DEVICE), nothing is sent to the cloud
- Cloud: always the cloud model (ONLY_IN_CLOUD)

## More features

- Interactive quiz: the model returns JSON, the app turns it into tappable questions with a score
- Streaming answers while the model is writing
- Photo of notes, Hindi and English output, local history

## Platform note

On-device inference needs Chrome on Desktop (v139+) with the Prompt API enabled.
On other browsers, including Android Chrome, the app uses the cloud fallback.

## Run locally

1. Create a Firebase project, enable AI Logic (Gemini Developer API) and
   register a web app.
2. Put your own firebaseConfig and reCAPTCHA Enterprise site key in
   src/firebase.js.
3. Register the app in Firebase App Check, then add a debug token.
4. Create a file named .env.local with this line:

       VITE_APPCHECK_DEBUG_TOKEN=your-debug-token

5. Install and start:

       npm install
       npm run dev

## Tech stack

React, Vite, Firebase AI Logic, Firebase App Check, Gemini Developer API.

## License

Apache License 2.0
