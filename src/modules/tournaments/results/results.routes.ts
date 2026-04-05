import { Router } from "express";
import express from "express";
import { ResultsService } from "./results.service";

const resultsService = new ResultsService();
const resultsRouter = Router({ mergeParams: true });



// GET /api/tournaments/:id/results/standings
resultsRouter.get("/standings", async (req: any, res: any) => {
    try {
        const standings = await resultsService.getStandings(Number(req.params.id));
        res.json({ success: true, data: standings });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default resultsRouter;
