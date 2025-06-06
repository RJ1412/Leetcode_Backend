import { db } from "../libs/db.js";

// Add a comment to a problem
export const addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    const { problemId } = req.params;
    const { userId } = req.user;

    if (!comment || !problemId || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newComment = await db.Discussion.create({
      data: {
        content: comment,
        problemId,
        userId,
      },
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// Get all comments for a specific problem
export const getCommentsForProblem = async (req, res) => {
  try {
    const { problemId } = req.params;

    const comments = await db.Discussion.findMany({
      where: { problemId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    res.json(comments);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};
