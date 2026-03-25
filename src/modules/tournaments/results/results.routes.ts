import { IncomingMessage, ServerResponse } from "http";
import { ResultsService } from "./results.service";

const resultsService = new ResultsService();

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

export default async function handleResultsRoutes(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url ?? '';
    const method = req.method ?? '';

    // PATCH /api/tournaments/:id/results/settings
    const settingsMatch = url.match(/\/api\/tournaments\/([a-zA-Z0-9-]+)\/results\/settings/);
    if (settingsMatch && method === "PATCH") {
        const tournamentId = Number(settingsMatch[1]);
        if (isNaN(tournamentId)) {
            sendJSON(res, 400, { error: "Invalid tournament ID" });
            return true;
        }

        try {
            const body = await parseBody(req);
            if (typeof body.autoPublish !== "boolean") {
                sendJSON(res, 400, { error: "autoPublish must be a boolean" });
                return true;
            }
            const tournament = await resultsService.toggleAutoPublish(tournamentId, body.autoPublish);
            sendJSON(res, 200, { message: "Settings updated successfully", autoPublishResults: tournament.autoPublishResults });
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

    // GET /api/tournaments/:id/results/standings
    const standingsMatch = url.match(/\/api\/tournaments\/([a-zA-Z0-9-]+)\/results\/standings/);
    if (standingsMatch && method === "GET") {
        const tournamentId = Number(standingsMatch[1]);
        if (isNaN(tournamentId)) {
            sendJSON(res, 400, { error: "Invalid tournament ID" });
            return true;
        }

        try {
            const standings = await resultsService.getStandings(tournamentId);
            sendJSON(res, 200, standings);
            return true;
        } catch (err: any) {
            sendJSON(res, 500, { error: err.message });
            return true;
        }
    }

    return false;
}
