import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import identifyRouter from "./src/routes/identify.routes";
import { sendResponse } from "./src/utils/helper";

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT||"3000");

// support parsing of application/json type post data
app.use(express.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(
	express.urlencoded({
		extended: true,
	})
);

app.use("/identify", identifyRouter);

/* Error handler middleware */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	const statusCode = err.statusCode || 500;
	res.status(statusCode).json(
		sendResponse({
			success: false,
			message: err.message,
			data: {},
			errorObject: err,
			customCode: 0,
		})
	);

	return;
});

app.listen(port, "0.0.0.0", () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
