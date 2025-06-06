import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getProfile, getSolvedProblemsActivity, getSolvedProblemsByTopic, getSolvedProblemsStats, updateProfile } from "../controllers/user.controllers.js";

const userRoutes = express.Router();

userRoutes.get("/my-profile", authMiddleware, getProfile);
userRoutes.put("/update-profile", authMiddleware, updateProfile);
userRoutes.get("/solved-problems-stats", authMiddleware, getSolvedProblemsStats);
userRoutes.get("/solved-problems-topics", authMiddleware, getSolvedProblemsByTopic);
userRoutes.get("/solved-heatmap", authMiddleware, getSolvedProblemsActivity);
export default userRoutes;
