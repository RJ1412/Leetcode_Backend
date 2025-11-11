// controllers/executeCode.js
import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

// ✅ Helper: convert numeric Judge0 ID -> readable language name for DB
const getLanguageNameForDB = (id) => {
  const map = {
    63: "JavaScript",
    74: "TypeScript",
    71: "Python",
    62: "Java",
    50: "C",
    54: "C++",
    92: "Go",
    46: "Ruby",
    52: "PHP",
    60: "C#",
    55: "Rust",
  };
  return map[id] || `lang-${id}`;
};

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_outputs, problemId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Validate inputs
    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_outputs) ||
      expected_outputs.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid or missing test cases" });
    }

    if (!source_code || typeof source_code !== "string" || source_code.trim() === "") {
      return res.status(400).json({ error: "Missing source_code" });
    }

    // Build submissions for Judge0
    const submissions = stdin.map((input) => {
      if (language_id === 63 || language_id === 74) {
        return {
          language_id,
          source_code,
          files: [{ name: "script.js", content: source_code }],
          stdin: input,
        };
      }
      return { language_id, source_code, stdin: input };
    });

    console.log("Submitting sample submission:", {
      language_id: submissions[0].language_id,
      hasFiles: !!submissions[0].files,
      stdin: submissions[0].stdin,
    });

    // Submit to Judge0
    const submitResponse = await submitBatch(submissions);
    const submitArray = Array.isArray(submitResponse)
      ? submitResponse
      : submitResponse?.submissions || [];
    const tokens = submitArray.map((r) => r.token).filter(Boolean);
    if (!tokens.length) {
      return res
        .status(502)
        .json({ error: "Judge0 did not return tokens", detail: submitResponse });
    }

    // Poll for results
    const results = await pollBatchResults(tokens);
    console.log("Judge0 results:", results);

    // Build result summary
    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const stdout = typeof result.stdout === "string" ? result.stdout.trim() : undefined;
      const expected_output =
        typeof expected_outputs[i] === "string"
          ? expected_outputs[i].trim()
          : expected_outputs[i];

      const passed =
        stdout !== undefined &&
        expected_output !== undefined &&
        stdout === expected_output;

      if (!passed) allPassed = false;

      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status?.description || "Unknown",
        memory: result.memory ? `${result.memory} KB` : null,
        time: result.time ? `${result.time} s` : null,
      };
    });

    console.log("Detailed results:", detailedResults);

    // ✅ Fix: map numeric Judge0 ID → readable language name for DB
    const judgeLangId = getJudge0LanguageId(language_id); // numeric id for Judge0
    const languageName = getLanguageNameForDB(judgeLangId);

    // Build DB payload
    const submissionPayload = {
      userId,
      problemId,
      sourceCode: { code: source_code },
      language: languageName,
      stdin: Array.isArray(stdin) ? stdin.join("\n") : String(stdin ?? ""),
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
    };

    // Save to DB
    let submission;
    try {
      submission = await db.submission.create({ data: submissionPayload });
    } catch (dbErr) {
      console.error("DB save error summary:", {
        userId,
        problemId,
        language: submissionPayload.language,
      });
      console.error("DB error:", dbErr.stack || dbErr.message);
      return res.status(500).json({
        error: "DB write failed",
        detail: dbErr.message,
        judgeResults: detailedResults,
      });
    }

    // Save solved + test cases
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

      if (testCaseResults.length)
        await db.testCaseResult.createMany({ data: testCaseResults });
    } catch (nonFatalErr) {
      console.error("Non-fatal DB write error:", nonFatalErr.stack || nonFatalErr.message);
    }

    const submissionWithTestCase = await db.submission.findUnique({
      where: { id: submission.id },
      include: { testCases: true },
    });

    return res.status(200).json({
      success: true,
      submission: submissionWithTestCase,
    });
  } catch (err) {
    console.error("executeCode error:", err.stack || err);
    const detail = err.response
      ? { status: err.response.status, data: err.response.data }
      : null;
    return res.status(500).json({ error: "Failed to execute code", detail });
  }
};
