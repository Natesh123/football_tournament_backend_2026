import { Router } from "express";
import express from "express";
import { VenueService } from "./venue.service";

const venueService = new VenueService();
const venueRouter = Router({ mergeParams: true });

// GET /api/tournaments/:id/venues
venueRouter.get("/", async (req: any, res: any) => {
    try {
        const venue = await venueService.getVenue(Number(req.params.id));
        if (!venue) return res.status(404).json({ success: false, message: "Venue not found" });
        res.json({ success: true, data: venue });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST/PUT /api/tournaments/:id/venues
venueRouter.post("/", upsert);
venueRouter.put("/", upsert);

async function upsert(req: any, res: any) {
    try {
        if (!req.body.primaryVenueName) {
            return res.status(400).json({ success: false, message: "primaryVenueName is required" });
        }
        const venue = await venueService.upsertVenue(Number(req.params.id), req.body);
        res.status(201).json({ success: true, data: venue });
    } catch (err: any) {
        const status = err.message === "Tournament not found" ? 404 : 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

export default venueRouter;
