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
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, textAlign: "left" }}>
      <h2>Study Notes Summarizer</h2>
      <textarea rows={10} style={{ width: "100%" }} value={text}
        onChange={(e) => setText(e.target.value)} placeholder="Paste notes here..." />
      <button disabled={busy || !text.trim()} onClick={summarize}>
        {busy ? "Working..." : "Summarize"}
      </button>
      {where && <p>Ran on: <b>{where}</b></p>}
      {err && <p style={{ color: "tomato" }}>{err}</p>}
      <pre style={{ whiteSpace: "pre-wrap" }}>{summary}</pre>
    </div>
  );
}
