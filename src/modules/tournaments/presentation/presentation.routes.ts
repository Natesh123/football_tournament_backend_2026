import { IncomingMessage, ServerResponse } from "http";
import { PresentationService } from "./presentation.service";

const presentationService = new PresentationService();

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

export default async function handlePresentationRoutes(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url ?? '';
    const method = req.method ?? '';
    const idMatch = url.match(/\/api\/tournaments\/([a-zA-Z0-9-]+)\/presentation/);

    if (idMatch) {
        const tournamentId = Number(idMatch[1]);
        if (isNaN(tournamentId)) return false;

        if (method === "GET") {
            try {
                const presentation = await presentationService.getPresentation(tournamentId);
                if (!presentation) {
                    sendJSON(res, 404, { error: "Presentation settings not found" });
                    return true;
                }
                sendJSON(res, 200, presentation);
                return true;
            } catch (err: any) {
                sendJSON(res, 500, { error: err.message });
                return true;
            }
        }

        if (method === "POST" || method === "PUT") {
            try {
                const body = await parseBody(req);
                const presentation = await presentationService.upsertPresentation(tournamentId, body);
                sendJSON(res, 201, presentation);
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

    return false;
}
