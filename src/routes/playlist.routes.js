// routes/playlist.routes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createPlayList,
  getMyPlaylists,
  getPlayAllListDetails,
  getPlayListDetails,
  addProblemToPlaylist,
  removeProblemFromPlaylist,
  deletePlayList,
} from "../controllers/playlist.controller.js";

const router = express.Router();
router.get("/mine", authMiddleware, getMyPlaylists);              
router.get("/", authMiddleware, getPlayAllListDetails);           

router.post("/create-playlist", authMiddleware, createPlayList);  
router.post("/:playlistId/add-problem", authMiddleware, addProblemToPlaylist);        
router.post("/:playlistId/remove-problems", authMiddleware, removeProblemFromPlaylist); 
router.delete("/:playlistId", authMiddleware, deletePlayList);                     

router.get("/:playlistId", authMiddleware, getPlayListDetails);                      

export default router;
