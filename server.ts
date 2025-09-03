import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import userRoutes from "./routes/user.ts";
import requestRouter from "./routes/requests.ts";
import registrationRouter from "./routes/registrations.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/user", userRoutes);
app.use("/users", userRoutes);
app.use("/requests", requestRouter);
app.use("/registration", registrationRouter);

app.get("/", (_req, res) => {
  res.send("Hello from TypeScript + Node.js ");
});

app.listen(PORT, () => {
  console.log(`Server running at port ${process.env.PORT}`);
});