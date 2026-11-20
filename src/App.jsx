import { useState } from "react";
import { deviceModel, cloudModel } from "./firebase";

const LONG_LIMIT = 6000; // is se lamba text seedha cloud par

export default function App() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [where, setWhere] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function summarize() {
    setBusy(true); setErr(""); setSummary(""); setWhere("");
    const prompt = "Summarize these study notes in 5 short bullet points:\n\n" + text;
    try {
      let model = cloudModel;
      if (text.length <= LONG_LIMIT) {
        model = deviceModel;
        try { await deviceModel.initializeDeviceModel(); } catch (e) { console.log(e); }
      }
      const result = await model.generateContent(prompt);
      setSummary(result.response.text());
      const src = result.response.inferenceSource;
      setWhere(src === "on_device" ? "On-device" : "Cloud");
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
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste your notes here..." />
        <div className="count">{text.length} characters</div>
        <button disabled={busy || !text.trim()} onClick={summarize}>
          {busy ? "Working..." : "Summarize"}
        </button>
        {where && (
          <div className={"badge " + (where === "On-device" ? "device" : "cloud")}>
            {where === "On-device" ? "⚡ Ran on-device" : "☁️ Ran in cloud"}
          </div>
        )}
        {err && <p className="err">{err}</p>}
        <div className="out">{summary}</div>
      </div>
    </>
  );
}
