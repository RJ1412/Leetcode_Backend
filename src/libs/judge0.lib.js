// libs/judge0.lib.js
import axios from "axios";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));


export const submitBatch = async (submissions) => {
  if (!process.env.JUDGE0_API_URL) throw new Error("Missing JUDGE0_API_URL");
  if (!Array.isArray(submissions) || submissions.length === 0) throw new Error("Empty submissions");

  const base = process.env.JUDGE0_API_URL.replace(/\/$/, "");
  const batchUrl = `${base}/submissions/batch?base64_encoded=false`;

  try {
    console.log("POST", batchUrl, "count:", submissions.length);
    const { data } = await axios.post(batchUrl, { submissions }, { timeout: 20000 });
    console.log("submitBatch response keys:", Object.keys(data || {}));
    return data;
  } catch (err) {
    // Log full response body if available (this contains validation details)
    if (err.response && err.response.data) {
      console.error("Judge0 returned status", err.response.status, "with body:");
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("submitBatch network/unknown error:", err.message);
    }

    // Try single-submission fallback to locate offending submission (best-effort)
    console.log("Attempting to submit items one-by-one to locate bad payload...");
    for (let i = 0; i < submissions.length; i++) {
      const s = submissions[i];
      try {
        // Use the single-submission endpoint with wait=true to get immediate validation
        const singleUrl = `${base}/submissions?base64_encoded=false&wait=true`;
        const payload = { ...s };
        const { data } = await axios.post(singleUrl, payload, { timeout: 20000 });
        console.log(`Item ${i} ok (token or response):`, data.submission || data);
        // small delay so judge isn't overwhelmed
        await sleep(200);
      } catch (singleErr) {
        console.error(`Item ${i} -> submission failed. index=${i}`);
        if (singleErr.response && singleErr.response.data) {
          console.error("Single submission response body:", JSON.stringify(singleErr.response.data, null, 2));
        } else {
          console.error("Single submission error:", singleErr.message);
        }
        // Throw a helpful error including index and the body
        throw new Error(`Batch submit failed; item ${i} invalid. See logs above for details.`);
      }
    }

    // If every single item was accepted (weird), rethrow original error
    throw err;
  }
};


export const pollBatchResults = async (tokens) => {
  if (!process.env.JUDGE0_API_URL) throw new Error("Missing JUDGE0_API_URL");
  if (!Array.isArray(tokens) || tokens.length === 0) throw new Error("No tokens");

  const url = `${process.env.JUDGE0_API_URL.replace(/\/$/, "")}/submissions/batch`;
  const params = { tokens: tokens.join(","), base64_encoded: false };
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const { data } = await axios.get(url, { params, timeout: 20000 });
      const results = data.submissions || data;
      if (!Array.isArray(results)) throw new Error("Unexpected poll response");
      const done = results.every((r) => r.status && r.status.id !== 1 && r.status.id !== 2);
      if (done) return results;
      console.log("poll attempt", attempt + 1, "not done yet");
    } catch (e) {
      console.error("poll error:", e.response ? e.response.data : e.message);
      // continue and retry
    }
    await sleep(1000);
  }
  throw new Error("pollBatchResults: max retries reached");
};

export function getJudge0LanguageId(language) {
  if (!language && language !== 0) return null;

  // If caller already passed a numeric id, return it (coerce to number)
  if (typeof language === "number" || /^\d+$/.test(String(language))) {
    const n = Number(language);
    return Number.isInteger(n) ? n : null;
  }

  const key = String(language).toLowerCase().trim();

  // Map common names / aliases to Judge0 numeric ids
  const map = {
    "typescript": 74,
    "ts": 74,
    "javascript": 63,
    "js": 63,
    "python": 71,
    "python3": 71,
    "py": 71,
    "java": 62,
    // add more mappings as needed
    // e.g. "c": 50, "cpp": 54, "c++": 54
  };

  return map[key] ?? null;
}
