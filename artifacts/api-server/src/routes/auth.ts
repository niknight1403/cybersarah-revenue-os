import { Router } from "express";

const router = Router();

router.get("/auth/me", (req, res) => {
  res.json({
    id: "owner-1",
    email: "admin@cybersarah.ai",
    name: "CyberSarah Admin",
    role: "admin",
  });
});

export default router;
