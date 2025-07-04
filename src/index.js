import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes  from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import problemRoutes from "./routes/problem.routes.js";
import executionRoute from "./routes/executeCode.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import userRoutes from "./routes/user.routes.js";
import discuss from "./routes/discuss.routes.js";
import router from "./routes/playlist.routes.js";
dotenv.config();
const app = express();
app.use(express.json()) 
app.use(cookieParser());
const PORT = process.env.PORT;

app.use(
    cors({
      origin: "https://leetcode-frontend-three.vercel.app",
      credentials: true,
    })
  );
app.listen(PORT ,() =>{
    console.log(`server is running on ${PORT}`)
})

app.get("/" , (req , res) => {
    res.send("Hello Guys Welcome to leetcode")
})

app.use("/api/v1/auth" , authRoutes)
app.use("/api/v1/problems" , problemRoutes)
app.use("/api/v1/execute-code" ,executionRoute)
app.use("/api/v1/submission" , submissionRoutes)
app.use("/api/v1/discuss" , discuss)
app.use("/api/v1/playlist" , router)
app.use("/api/v1/users" , userRoutes);
