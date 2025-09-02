import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("Hello from TypeScript + Node.js ");
});

app.listen(PORT, () => {
  console.log(`Server running at port ${process.env.PORT}`);
});



import usersRouter from "./routes/user.ts";
app.use("/users", usersRouter);

import teamRoutes from "./routes/teams.ts";
app.use("/api/teams", teamRoutes);

import eventRoutes from "./routes/getEvent.ts";
app.use(eventRoutes);

export default app;


import registrationRouter from "./routes/registrations.ts";
app.use("/registration", registrationRouter);

import requestRouter  from "./routes/requests.ts";
app.use("/requests", requestRouter);
