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

// GET /api/tournaments/:id/results
resultsRouter.get("/", async (req: any, res: any) => {
    try {
        const results = await resultsService.getResults(Number(req.params.id));
        res.json({ success: true, data: results });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/tournaments/:id/results/top-performance
resultsRouter.get("/top-performance", async (req: any, res: any) => {
    try {
        const stats = await resultsService.getTopPerformance(Number(req.params.id));
        res.json({ success: true, data: stats });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default resultsRouter;
