import { Router, type IRouter } from "express";
import healthRouter from "./health";
import satellitesRouter from "./satellites";
import weatherRouter from "./weather";
import locationRouter from "./location";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/satellites", satellitesRouter);
router.use("/weather", weatherRouter);
router.use("/location", locationRouter);
router.use("/history", historyRouter);

export default router;
