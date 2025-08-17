// server.ts
import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (_req, res) => {
  res.send("Hello from TypeScript + Node.js ");
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
