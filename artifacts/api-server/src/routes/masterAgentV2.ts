import { Router, type IRouter } from "express";
import { masterAgent } from "../agents/masterAgent";

const router: IRouter = Router();

// Autostart beim Laden der Route
masterAgent.start();

router.get("/master-agent", (_req, res) => {
  res.json(masterAgent.getState());
});

router.post("/master-agent/run/:agent", async (req, res) => {
  const agent = req.params.agent as "keys" | "finance" | "social";
  res.json(await masterAgent.runNow(agent));
});

export default router;
