import { useState, useEffect } from "react";
import { deviceModel, cloudModel, privateModel, loadConfig } from "./firebase";

const LONG_LIMIT = 6000;
const MODES = {
  summary: "Summarize these study notes in 5 short bullet points.",
  quiz: 'Create 5 multiple-choice questions from these study notes. Return ONLY a JSON array and no other text. Each item must be {"q": question, "options": [4 short options], "answer": index 0-3 of the correct option, "why": one short explanation}. Keep the JSON keys in English.',
  cards: "Create 6 flashcards (Q: and A:) from these study notes.",
  simple: "Explain these study notes in very simple words for a beginner.",
};
const LABELS = { summary: "Summary", quiz: "Quiz", cards: "Flashcards", simple: "Explain simply" };
const HINTS = {
  auto: "On-device first, cloud as fallback",
  private: "Only on your device, nothing is sent to the cloud",
  cloud: "Always uses the cloud model",
};

const clean = (t) => t.replace(/\*\*/g, "");
let lastRaw = "";
const srcOf = (r) => {
  lastRaw = String(r.inferenceSource);
  return lastRaw.toLowerCase().includes("device") ? "On-device" : "Cloud";
};

function parseQuiz(t) {
  try {
    const s = t.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(s.slice(s.indexOf("["), s.lastIndexOf("]") + 1));
    if (Array.isArray(arr) && arr.length && arr.every((q) => q.q && Array.isArray(q.options) && typeof q.answer === "number")) return arr;
  } catch (e) { console.log(e); }
  return null;
}

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
  const [privacy, setPrivacy] = useState("auto");
  const [out, setOut] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [picks, setPicks] = useState({});
  const [where, setWhere] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadHist);
  const [cfg, setCfg] = useState({ longLimit: LONG_LIMIT, summaryPrompt: MODES.summary });
  useEffect(() => { loadConfig().then(setCfg); }, []);

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

  const [speaking, setSpeaking] = useState(false);

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(out);
    u.lang = lang === "hi" ? "hi-IN" : "en-US";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { console.log(e); }
  }

  async function run() {
    setBusy(true); setErr(""); setOut(""); setWhere(""); setQuiz(null); setPicks({});
    const ask = (mode === "summary" ? cfg.summaryPrompt : MODES[mode]) + (lang === "hi" ? " Write the content in simple Hindi." : " Write in English.");
    try {
      if (privacy === "private") {
        let ok = false;
        try {
          const LM = self.LanguageModel;
          ok = !!LM && (await LM.availability()) !== "unavailable";
        } catch (e) { console.log(e); }
        if (!ok) throw new Error("on-device model is not available here");
      }
      let model;
      if (privacy === "cloud") model = cloudModel;
      else if (privacy === "private") model = privateModel;
      else model = (image || text.length <= cfg.longLimit) ? deviceModel : cloudModel;

      const input = image
        ? [ask + " Read the notes written in the image. " + text, await shrink(image)]
        : ask + "\n\n" + text;

      if (model !== cloudModel) {
        try { await model.initializeDeviceModel(); } catch (e) { if (privacy === "private") throw e; console.log(e); }
      }

      if (mode === "quiz") {
        const result = await model.generateContent(input);
        const t = result.response.text();
        const parsed = parseQuiz(t);
        if (parsed) setQuiz(parsed); else setOut(clean(t));
        const w2 = srcOf(result.response);
        if (privacy === "private" && w2 !== "On-device") { setQuiz(null); setOut(""); throw new Error("response did not come from the device"); }
        setWhere(w2);
      } else {
        const res = await model.generateContentStream(input);
        let acc = "";
        for await (const chunk of res.stream) { acc += chunk.text(); setOut(clean(acc)); }
        const final = await res.response;
        const w = srcOf(final);
        if (privacy === "private" && w !== "On-device") { setOut(""); throw new Error("response did not come from the device"); }
        setWhere(w);
        saveHist({ mode: LABELS[mode], where: w, out: clean(acc) });
      }
    } catch (e) {
      setErr(privacy === "private"
        ? "Private mode needs the on-device model (Desktop Chrome 139+). Switch to Auto or Cloud. " + String(e)
        : String(e));
    }
    setBusy(false);
  }

  const answered = Object.keys(picks).length;
  const score = quiz ? quiz.filter((q, i) => picks[i] === q.answer).length : 0;

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
        <div className="row">
          <span className={"chip" + (privacy === "auto" ? " on" : "")} onClick={() => setPrivacy("auto")}>⚡ Auto</span>
          <span className={"chip" + (privacy === "private" ? " on" : "")} onClick={() => setPrivacy("private")}>🔒 Private</span>
          <span className={"chip" + (privacy === "cloud" ? " on" : "")} onClick={() => setPrivacy("cloud")}>☁️ Cloud</span>
        </div>
        <div className="hint">{HINTS[privacy]}</div>
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
        {quiz && (
          <div>
            {quiz.map((q, i) => (
              <div key={i} className="q">
                <div className="qt">{i + 1}. {q.q}</div>
                {q.options.map((o, j) => {
                  let cls = "opt";
                  if (picks[i] !== undefined) {
                    if (j === q.answer) cls += " right";
                    else if (j === picks[i]) cls += " wrong";
                  }
                  return (
                    <div key={j} className={cls} onClick={() => picks[i] === undefined && setPicks({ ...picks, [i]: j })}>{o}</div>
                  );
                })}
                {picks[i] !== undefined && q.why && <div className="why">💡 {q.why}</div>}
              </div>
            ))}
            <div className="score">Score: {score} / {quiz.length} ({answered} answered)</div>
          </div>
        )}
        <div className="out">{out}</div>
        {out && (
          <>
            <span className="chip" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</span>
            <span className="chip" onClick={speak}>{speaking ? "⏹ Stop" : "🔊 Read aloud"}</span>
          </>
        )}
      </div>
      {history.length > 0 && (
        <div className="card hist">
          <b>Recent</b>
          {history.map((h, i) => (
            <div key={i} className="h" onClick={() => { setQuiz(null); setOut(h.out); setWhere(h.where); }}>
              {h.mode}: {h.out.slice(0, 60)}...
            </div>
          ))}
        </div>
      )}
    </>
  );
}
