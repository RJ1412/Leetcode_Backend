import { db } from "../libs/db.js";


// GET /my-profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    const solvedProblems = await db.problemSolved.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficuilty: true,
          },
        },
      },
    });

    return res.status(200).json({
      user,
      solvedProblems: solvedProblems.map((item) => ({
        id: item.problem.id,
        title: item.problem.title,
        difficulty: item.problem.difficuilty,
      })),
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PUT /update-profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { name },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// GET /solved-problems-stats
export const getSolvedProblemsStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await db.problemSolved.groupBy({
      by: ["problemId"],
      where: { userId },
    });

    const difficulties = await db.problem.findMany({
      where: {
        id: { in: stats.map((s) => s.problemId) },
      },
      select: {
        difficuilty: true,
      },
    });

    const difficultyCount = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    for (const item of difficulties) {
      difficultyCount[item.difficuilty]++;
    }

    return res.status(200).json({
      pieChartData: [
        { name: "Easy", value: difficultyCount.EASY },
        { name: "Medium", value: difficultyCount.MEDIUM },
        { name: "Hard", value: difficultyCount.HARD },
      ],
    });
  } catch (error) {
    console.error("Error getting difficulty stats:", error);
    return res.status(500).json({ message: "Could not retrieve stats" });
  }
};

// GET /solved-problems-topics
export const getSolvedProblemsByTopic = async (req, res) => {
  try {
    const userId = req.user.id;

    const solved = await db.problemSolved.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            tags: true,
          },
        },
      },
    });

    const topicCount = {};
    solved.forEach(({ problem }) => {
      problem.tags.forEach((tag) => {
        topicCount[tag] = (topicCount[tag] || 0) + 1;
      });
    });

    const topicChartData = Object.entries(topicCount).map(([name, value]) => ({
      name,
      value,
    }));

    return res.status(200).json({ topicChartData });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Error fetching topic-wise data" });
  }
};

export const getSolvedProblemsActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Group by timestamp, filtered by userId, count all rows
    const rawActivity = await db.problemSolved.groupBy({
      by: ['createdAt'],
      where: { userId: userId },
      _count: {
        _all: true, // Count all fields to get total rows per createdAt timestamp
      },
    });

    // Convert timestamps to YYYY-MM-DD and sum up
    const dailyCounts = {};
    rawActivity.forEach(entry => {
      const date = entry.createdAt.toISOString().split('T')[0];
      const count = entry._count._all; // Fix: access count properly
      dailyCounts[date] = (dailyCounts[date] || 0) + count;
    });

    // Convert map to array format for heatmap
    const heatmapData = Object.entries(dailyCounts).map(
      ([date, count]) => ({ date, count })
    );

    return res.json({ heatmapData });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return res.status(500).json({ message: 'Failed to fetch heatmap data' });
  }
};
