import { useState } from "react";
import { deviceModel, cloudModel } from "./firebase";

const LONG_LIMIT = 6000;
const MODES = {
  summary: "Summarize these study notes in 5 short bullet points.",
  quiz: "Create 5 quiz questions with short answers from these study notes.",
  cards: "Create 6 flashcards (Q: and A:) from these study notes.",
  simple: "Explain these study notes in very simple words for a beginner.",
};
const LABELS = { summary: "Summary", quiz: "Quiz", cards: "Flashcards", simple: "Explain simply" };

function shrink(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.85).split(",")[1];
      resolve({ type: "inlineData", inlineData: { data, mimeType: "image/jpeg" } });
    };
    img.src = URL.createObjectURL(file);
  });
}

function loadHist() {
  try { return JSON.parse(localStorage.getItem("hist") || "[]"); } catch { return []; }
}

export default function App() {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [mode, setMode] = useState("summary");
  const [lang, setLang] = useState("en");
  const [out, setOut] = useState("");
  const [where, setWhere] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadHist);

  function onFile(e) {
    const f = e.target.files[0];
    if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
  }
  function clearImg() { setImage(null); setPreview(""); }

  function saveHist(entry) {
    const next = [entry, ...history].slice(0, 5);
    setHistory(next);
    try { localStorage.setItem("hist", JSON.stringify(next)); } catch (e) { console.log(e); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { console.log(e); }
  }

  async function run() {
    setBusy(true); setErr(""); setOut(""); setWhere("");
    try {
      const ask = MODES[mode] + (lang === "hi" ? " Answer in simple Hindi." : " Answer in English.");
      let model = cloudModel;
      let input;
      if (image) {
        model = deviceModel;
        input = [ask + " Read the notes written in the image. " + text, await shrink(image)];
      } else {
        model = text.length <= LONG_LIMIT ? deviceModel : cloudModel;
        input = ask + "\n\n" + text;
      }
      if (model === deviceModel) {
        try { await deviceModel.initializeDeviceModel(); } catch (e) { console.log(e); }
      }
      const result = await model.generateContent(input);
      const t = result.response.text();
      const w = result.response.inferenceSource === "on_device" ? "On-device" : "Cloud";
      setOut(t);
      setWhere(w);
      saveHist({ mode: LABELS[mode], where: w, out: t });
    } catch (e) {
      setErr(String(e));
    }
    setBusy(false);
  }

  return (
    <>
      <h1>Study Notes Summarizer</h1>
      <p className="sub">Private on-device AI, with cloud fallback</p>
      <div className="card">
        <div className="row">
          {Object.keys(MODES).map((k) => (
            <span key={k} className={"chip" + (mode === k ? " on" : "")} onClick={() => setMode(k)}>{LABELS[k]}</span>
          ))}
        </div>
        <div className="row">
          <span className={"chip" + (lang === "en" ? " on" : "")} onClick={() => setLang("en")}>English</span>
          <span className={"chip" + (lang === "hi" ? " on" : "")} onClick={() => setLang("hi")}>हिन्दी</span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your notes here, or add a photo..." />
        <div className="count">{text.length} characters</div>
        <label className="pick">📷 Add photo of notes
          <input type="file" accept="image/*" hidden onChange={onFile} />
        </label>
        {preview && (
          <div className="prev">
            <img src={preview} alt="notes" />
            <span className="chip" onClick={clearImg}>✕ Remove</span>
          </div>
        )}
        <button disabled={busy || (!text.trim() && !image)} onClick={run}>
          {busy ? "Working..." : LABELS[mode]}
        </button>
        {where && (
          <div className={"badge " + (where === "On-device" ? "device" : "cloud")}>
            {where === "On-device" ? "⚡ Ran on-device" : "☁️ Ran in cloud"}
          </div>
        )}
        {err && <p className="err">{err}</p>}
        <div className="out">{out}</div>
        {out && <span className="chip" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</span>}
      </div>
      {history.length > 0 && (
        <div className="card hist">
          <b>Recent</b>
          {history.map((h, i) => (
            <div key={i} className="h" onClick={() => { setOut(h.out); setWhere(h.where); }}>
              {h.mode}: {h.out.slice(0, 60)}...
            </div>
          ))}
        </div>
      )}
    </>
  );
}
