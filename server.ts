import express from "express";
import cors from 'cors';
import dotenv from "dotenv";
import bodyParser from "body-parser";
import razorpayRoutes from "./routes/razorpayRoutes.ts";
import userRoutes from "./routes/user.ts"
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors())

app.use(express.json())

app.use(bodyParser.json())

app.use(express.urlencoded({extended : true}));

app.use("/api/razorpay", razorpayRoutes);
app.use("/api/user", userRoutes);
app.get("/", (_req, res) => {
  res.send("Hello from TypeScript + Node.js ");
});

app.listen(PORT, () => {
  console.log(`Server running at port ${process.env.PORT}`);
});
