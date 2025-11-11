// controllers/executeCode.js
import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_outputs, problemId } =
      req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_outputs) ||
      expected_outputs.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid or missing test cases" });
    }

    // Build submissions carefully:
    // - For JS/TS (63/74) provide files: [{ name: "script.js", content }]
    // - For other languages, provide source_code
    if (!source_code || typeof source_code !== "string" || source_code.trim() === "") {
  return res.status(400).json({ error: "Missing source_code" });
}

const submissions = stdin.map((input) => {
  if (language_id === 63 || language_id === 74) {
    return {
      language_id,
      // include source_code because this Judge0 validates it
      source_code,
      // include files so the runner has /box/script.js
      files: [{ name: "script.js", content: source_code }],
      stdin: input,
    };
  }

  // default path for other languages
  return {
    language_id,
    source_code,
    stdin: input,
  };
});


    // Debug log first submission shape (avoid logging full source in prod)
    console.log("Submitting sample submission:", {
      language_id: submissions[0].language_id,
      hasFiles: !!submissions[0].files,
      hasSource: !!submissions[0].source_code,
      stdin: submissions[0].stdin,
    });

    const submitResponse = await submitBatch(submissions);

    // Normalize response: some Judge0 return array, some { submissions: [...] }
    const submitArray = Array.isArray(submitResponse)
      ? submitResponse
      : submitResponse?.submissions || [];

    const tokens = submitArray.map((r) => r.token).filter(Boolean);

    if (!tokens.length) {
      console.error("No tokens from Judge0 submit:", submitResponse);
      return res.status(502).json({ error: "Judge0 did not return tokens", detail: submitResponse });
    }

    const results = await pollBatchResults(tokens);

    console.log("Judge0 results:", results);

    // Process results
    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const stdout = typeof result.stdout === "string" ? result.stdout.trim() : undefined;
      const expected_output = typeof expected_outputs[i] === "string"
        ? expected_outputs[i].trim()
        : expected_outputs[i];

      const passed = stdout !== undefined && expected_output !== undefined && stdout === expected_output;
      if (!passed) allPassed = false;

      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status?.description || "Unknown",
        memory: result.memory ? `${result.memory} KB` : undefined,
        time: result.time ? `${result.time} s` : undefined,
      };
    });

    console.log("Detailed results:", detailedResults);

    // Persist to DB (wrapped in try/catch so we can surface judge output if DB fails)
    let submission;
    try {
      submission = await db.submission.create({
        data: {
          userId,
          problemId,
          sourceCode: source_code,
          language: getJudge0LanguageId(language_id),
          stdin: stdin.join("\n"),
          stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
          stderr: detailedResults.some((r) => r.stderr)
            ? JSON.stringify(detailedResults.map((r) => r.stderr))
            : null,
          compileOutput: detailedResults.some((r) => r.compile_output)
            ? JSON.stringify(detailedResults.map((r) => r.compile_output))
            : null,
          status: allPassed ? "Accepted" : "Wrong Answer",
          memory: detailedResults.some((r) => r.memory)
            ? JSON.stringify(detailedResults.map((r) => r.memory))
            : null,
          time: detailedResults.some((r) => r.time)
            ? JSON.stringify(detailedResults.map((r) => r.time))
            : null,
        },
      });
    } catch (dbErr) {
      console.error("DB save error:", dbErr.stack || dbErr.message);
      return res.status(500).json({ error: "DB write failed", detail: dbErr.message, judgeResults: detailedResults });
    }

    // Upsert problem solved & store test case results (best-effort)
    try {
      if (allPassed) {
        await db.problemSolved.upsert({
          where: { userId_problemId: { userId, problemId } },
          update: {},
          create: { userId, problemId },
        });
      }

      const testCaseResults = detailedResults.map((r) => ({
        submissionId: submission.id,
        testCase: r.testCase,
        passed: r.passed,
        stdout: r.stdout,
        expected: r.expected,
        stderr: r.stderr,
        compileOutput: r.compile_output,
        status: r.status,
        memory: r.memory,
        time: r.time,
      }));

      if (testCaseResults.length) await db.testCaseResult.createMany({ data: testCaseResults });
    } catch (nonFatalErr) {
      console.error("Non-fatal DB write error:", nonFatalErr.stack || nonFatalErr.message);
    }

    const submissionWithTestCase = await db.submission.findUnique({
      where: { id: submission.id },
      include: { testCases: true },
    });

    return res.status(200).json({ success: true, submission: submissionWithTestCase });
  } catch (err) {
    console.error("executeCode error:", err.stack || err);
    const detail = err.response ? { status: err.response.status, data: err.response.data } : null;
    return res.status(500).json({ error: "Failed to execute code", detail });
  }
};
