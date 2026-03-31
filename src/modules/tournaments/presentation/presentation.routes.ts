import { Router } from "express";
import { PresentationService } from "./presentation.service";

const presentationService = new PresentationService();
const presentationRouter = Router({ mergeParams: true });

// GET /api/tournaments/:id/presentation
presentationRouter.get("/", async (req: any, res: any) => {
    try {
        const data = await presentationService.getPresentation(Number(req.params.id));
        if (!data) return res.status(404).json({ success: false, message: "Presentation settings not found" });
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST/PUT /api/tournaments/:id/presentation
presentationRouter.post("/", upsert);
presentationRouter.put("/", upsert);

async function upsert(req: any, res: any) {
    try {
        const data = await presentationService.upsertPresentation(Number(req.params.id), req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        const status = err.message === "Tournament not found" ? 404 : 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

export default presentationRouter;
