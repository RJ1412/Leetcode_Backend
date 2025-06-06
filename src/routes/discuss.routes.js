import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { addComment, getCommentsForProblem } from "../controllers/discussion.controller.js";
const discuss = express.Router();

discuss.post("/:problemId", authMiddleware, addComment);

discuss.get("/:problemId", getCommentsForProblem);

export default discuss;
