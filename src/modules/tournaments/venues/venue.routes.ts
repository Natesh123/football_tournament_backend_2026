import { IncomingMessage, ServerResponse } from "http";
import { VenueService } from "./venue.service";

const venueService = new VenueService();

function parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function sendJSON(res: ServerResponse, status: number, data: any) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

export default async function handleVenueRoutes(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url ?? '';
    const method = req.method ?? '';
    const idMatch = url.match(/\/api\/tournaments\/([a-zA-Z0-9-]+)\/venues/);

    if (idMatch) {
        const tournamentId = Number(idMatch[1]);
        if (isNaN(tournamentId)) return false;

        if (method === "GET") {
            try {
                const venue = await venueService.getVenue(tournamentId);
                if (!venue) {
                    sendJSON(res, 404, { error: "Venue not found for this tournament" });
                    return true;
                }
                sendJSON(res, 200, venue);
                return true;
            } catch (err: any) {
                sendJSON(res, 500, { error: err.message });
                return true;
            }
        }

        if (method === "POST" || method === "PUT") {
            try {
                const body = await parseBody(req);
                if (!body.primaryVenueName) {
                    sendJSON(res, 400, { error: "primaryVenueName is required" });
                    return true;
                }
                const venue = await venueService.upsertVenue(tournamentId, body);
                sendJSON(res, 201, venue);
                return true;
            } catch (err: any) {
                if (err.message === "Tournament not found") {
                    sendJSON(res, 404, { error: err.message });
                    return true;
                }
                sendJSON(res, 500, { error: err.message });
                return true;
            }
        }
    }

    return false; // Route not matched handled by this router
}
