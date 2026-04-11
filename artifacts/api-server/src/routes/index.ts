import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import dictionaryRouter from "./dictionary";
import eventsRouter from "./events";
import songsRouter from "./songs";
import artistsRouter from "./artists";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(dictionaryRouter);
router.use(eventsRouter);
router.use(songsRouter);
router.use(artistsRouter);

export default router;
