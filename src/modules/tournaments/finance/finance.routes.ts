import { Router } from "express";
import express from "express";
import { FinanceService } from "./finance.service";

const financeService = new FinanceService();
const financeRouter = Router({ mergeParams: true });

// GET /api/tournaments/:id/finance
financeRouter.get("/", async (req: any, res: any) => {
    try {
        const data = await financeService.getFinance(Number(req.params.id));
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST/PUT /api/tournaments/:id/finance
financeRouter.post("/", upsert);
financeRouter.put("/", upsert);

async function upsert(req: any, res: any) {
    try {
        const financeData = req.body.finance || {};
        const prizePoolData = req.body.prizePool || {};
        const result = await financeService.upsertFinance(Number(req.params.id), financeData, prizePoolData);
        res.status(201).json({ success: true, data: result });
    } catch (err: any) {
        const badMessages = ["Tournament not found", "Prize pool percentages must equal exactly 100"];
        const status = badMessages.includes(err.message) ? 400 : 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

export default financeRouter;
