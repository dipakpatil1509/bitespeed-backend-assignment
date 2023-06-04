import express, { NextFunction, Request, Response } from "express";
import dotenv from 'dotenv';

dotenv.config();

const bodyParser = require("body-parser");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.json({ message: "ok" });
});

// app.use("/programming-languages", programmingLanguagesRouter);

/* Error handler middleware */
app.use((err:any, req:Request, res:Response, next:NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });

  return;
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
