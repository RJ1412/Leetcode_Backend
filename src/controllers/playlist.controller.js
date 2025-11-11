// import { db } from "../libs/db.js";

// export const createPlayList = async (req, res) => {
//   try {
//     const { name, description } = req.body;
//     const userId = req.user.id;

//     const playList = await db.Playlist.create({
//       data: {
//         name,
//         description,
//         userId,
//       },
//     });
//     res.status(200).json({
//       success: true,
//       message: "Playlist created successfully",
//       playList,
//     });
//   } catch (error) {
//     console.error("Error creating playlist:", error);
//     res.status(500).json({ error: "Failed to create playlist" });
//   }
// };

// export const getPlayAllListDetails = async (req, res) => {
//   try {
//     const playLists = await db.Playlist.findMany({
      
//       include: {
//         user: true, // 👈 Include creator
//         problems: {
//           include: {
//             problem: true,
//           },
//         },
//       },
//     });
//     res.status(200).json({
//       success: true,
//       message: "Playlist fetched successfully",
//       playLists,
//     });
//   } catch (error) {
//     console.error("Error fetching playlist:", error);
//     res.status(500).json({ error: "Failed to fetch playlist" });
//   }
// };

// export const getPlayListDetails = async (req, res) => {
//   const { playlistId } = req.params;

//   try {
//     const playList = await db.Playlist.findUnique({
//       where: { id: playlistId },
//       include: {
//         user: true, // 👈 Include creator
//         problems: {
//           include: {
//             problem: true,
//           },
//         },
//       },
//     });

//     if (!playList) {
//       return res.status(404).json({ error: "Playlist not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Playlist fetched successfully",
//       playList,
//     });
//   } catch (error) {
//     console.error("Error fetching playlist:", error);
//     res.status(500).json({ error: "Failed to fetch playlist" });
//   }
// };

// export const addProblemToPlaylist = async (req, res) => {
//   const { playlistId } = req.params;
//   const { problemIds } = req.body; 

//   try {
//     if (!Array.isArray(problemIds) || problemIds.length === 0) {
//       return res.status(400).json({ error: "Invalid or missing problemIds" });
//     }

//     console.log(
//       problemIds.map((problemId) => ({
//         playlistId,
//         problemId,
//       }))
//     );

//     const problemsInPlaylist = await db.ProblemPlaylist.createMany({
//       data: problemIds.map((problemId) => ({
//         playlistId, 
//         problemId,
//       })),
//     });

//     res.status(201).json({
//       success: true,
//       message: "Problems added to playlist successfully",
//       problemsInPlaylist,
//     });
//   } catch (error) {
//     console.error("Error adding problems to playlist:", error.message);
//     res.status(500).json({ error: "Failed to add problems to playlist" });
//   }
// };

// export const deletePlayList = async (req, res) => {
//   const { playlistId } = req.params;

//   try {
//     const deletedPlaylist = await db.playlist.delete({
//       where: {
//         id: playlistId,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Playlist deleted successfully",
//       deletedPlaylist,
//     });
//   } catch (error) {
//     console.error("Error deleting playlist:", error.message);
//     res.status(500).json({ error: "Failed to delete playlist" });
//   }
// };

// export const removeProblemFromPlaylist = async (req, res) => {
//   const { playlistId } = req.params;
//   const { problemIds } = req.body;

//   try {
//     if (!Array.isArray(problemIds) || problemIds.length === 0) {
//       return res.status(400).json({ error: "Invalid or missing problemIds" });
//     }
 

//     const deletedProblem = await db.ProblemPlaylist.deleteMany({
//       where: {
//         playlistId,
//         problemId: {
//           in: problemIds,
//         },
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Problem removed from playlist successfully",
//       deletedProblem,
//     });
//   } catch (error) {
//     console.error("Error removing problem from playlist:", error.message);
//     res.status(500).json({ error: "Failed to remove problem from playlist" });
//   }
// };



// controllers/playlist.controller.js
import { db } from "../libs/db.js";

export const createPlayList = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const playList = await db.playlist.create({
      data: {
        name,
        description,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      playList,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({ error: "Failed to create playlist" });
  }
};

export const getPlayAllListDetails = async (req, res) => {
  try {
    const playLists = await db.playlist.findMany({
      include: {
        user: true,
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });
    return res.status(200).json({
      success: true,
      message: "Playlists fetched successfully",
      playLists,
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return res.status(500).json({ error: "Failed to fetch playlists" });
  }
};

export const getPlayListDetails = async (req, res) => {
  const { playlistId } = req.params;
  console.log("getPlayListDetails params:", req.params);

  if (!playlistId) {
    return res.status(400).json({ error: "Missing playlistId param" });
  }

  try {
    const playList = await db.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: true,
        problems: {
          include: { problem: true },
        },
      },
    });

    console.log("db.playlist.findUnique result:", playList);

    if (!playList) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Playlist fetched successfully",
      playList,
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return res.status(500).json({ error: "Failed to fetch playlist" });
  }
};

export const addProblemToPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body;

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: "Invalid or missing problemIds" });
    }

    const createManyPayload = problemIds.map((problemId) => ({
      playlistId,
      problemId,
    }));

    console.log("addProblemToPlaylist payload:", createManyPayload);

    const problemsInPlaylist = await db.problemPlaylist.createMany({
      data: createManyPayload,
      skipDuplicates: true,
    });

    return res.status(201).json({
      success: true,
      message: "Problems added to playlist successfully",
      problemsInPlaylist,
    });
  } catch (error) {
    console.error("Error adding problems to playlist:", error);
    return res.status(500).json({ error: "Failed to add problems to playlist" });
  }
};

export const deletePlayList = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const deletedPlaylist = await db.playlist.delete({
      where: { id: playlistId },
    });

    return res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
      deletedPlaylist,
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({ error: "Failed to delete playlist" });
  }
};

export const removeProblemFromPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body;

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: "Invalid or missing problemIds" });
    }

    const deletedProblem = await db.problemPlaylist.deleteMany({
      where: {
        playlistId,
        problemId: { in: problemIds },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Problem removed from playlist successfully",
      deletedProblem,
    });
  } catch (error) {
    console.error("Error removing problem from playlist:", error);
    return res.status(500).json({ error: "Failed to remove problem from playlist" });
  }
};

// controllers/playlist.controller.js
export const getMyPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const playLists = await db.playlist.findMany({
      where: { userId },
      include: {
        user: true,
        problems: {
          include: {
            problem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "User playlists fetched successfully",
      playLists,
    });
  } catch (err) {
    console.error("getMyPlaylists error:", err);
    return res.status(500).json({ error: "Failed to fetch user's playlists" });
  }
};
