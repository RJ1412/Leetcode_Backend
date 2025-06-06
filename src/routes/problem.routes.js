import express from 'express'
import { authMiddleware, checkAdmin } from '../middleware/auth.middleware.js';
import { createProblem, deleteProblem, getAllProblems, getAllProblemsSolvedByUser, getProblemById, updateProblem } from '../controllers/problems.controller.js';
const problemRoutes = express.Router();

problemRoutes.post("/create-problem" , authMiddleware , checkAdmin ,createProblem)

problemRoutes.post("/get-all-problem" , authMiddleware , getAllProblems)
problemRoutes.post("/get-problem/:id"  , getProblemById)
problemRoutes.post("/update-problem/:id" , authMiddleware , checkAdmin , updateProblem)
problemRoutes.delete("/delete-problem/:id" , authMiddleware , checkAdmin , deleteProblem)
problemRoutes.get("/get-solved-problem" , authMiddleware , getAllProblemsSolvedByUser)

export default problemRoutes;