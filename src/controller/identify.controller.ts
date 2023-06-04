import { NextFunction, Request, Response } from "express";
import identifyService, { identifyBody } from "../services/identify.service";
import { sendResponse } from "../utils/helper";

async function identify(req: Request, res: Response, next: NextFunction) {
	try {
		const response = await identifyService.identify(req.body as identifyBody);
		res.json(sendResponse(response));
	} catch (err: any) {
		console.error(`Error while creating programming language`, err.message);
		next(err);
	}
}

export default {
	identify,
};
