import { Router } from "express";
import identifyController from "../controller/identify.controller";

const router = Router();

router.post("/", identifyController.identify);

export default router;
