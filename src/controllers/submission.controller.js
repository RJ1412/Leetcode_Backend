import { db } from "../libs/db.js";

// ✅ Get all submissions of the logged-in user
export const getAllSubmission = async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await db.Submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Submissions fetched successfully",
      submissions,
    });
  } catch (error) {
    console.error("Fetch Submissions Error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

// ✅ Get all submissions for a specific problem (for the logged-in user)
export const getSubmissionsForProblem = async (req, res) => {
  try {
    const userId = req.user.id;
    const problemId = req.params.problemId;

    const submissions = await db.Submission.findMany({
      where: {
        userId,
        problemId,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Submissions fetched successfully",
      submissions,
    });
  } catch (error) {
    console.error("Fetch Submissions for Problem Error:", error);
    res.status(500).json({ error: "Failed to fetch submissions for problem" });
  }
};

// ✅ Get total submission count for a problem (global)
export const getAllTheSubmissionsForProblem = async (req, res) => {
  try {
    const problemId = req.params.problemId;

    const count = await db.Submission.count({
      where: { problemId },
    });

    res.status(200).json({
      success: true,
      message: "Submission count fetched successfully",
      count,
    });
  } catch (error) {
    console.error("Fetch Submission Count Error:", error);
    res.status(500).json({ error: "Failed to fetch submission count" });
  }
};
