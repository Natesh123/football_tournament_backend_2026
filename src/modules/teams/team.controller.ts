import { Request, Response } from "express";
import { TeamService } from "./team.service";
import { moveLogoToTeamFolder, getTeamGalleryUrls } from "../../middleware/upload.middleware";
import path from "path";
import fs from "fs";

export class TeamController {
    private teamService = new TeamService();

    getAll = async (req: Request, res: Response) => {
        try {
            const search = req.query.search as string;
            const teams = await this.teamService.getAll(search);
            res.json(teams);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch teams", error });
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const team = await this.teamService.getById(req.params.id as string);
            if (!team) {
                return res.status(404).json({ message: "Team not found" });
            }
            res.json(team);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch team", error });
        }
    };

    create = async (req: Request, res: Response) => {
        const tempFile = (req as any).file as Express.Multer.File | undefined;
        try {
            // 1. Save team without logo first (to get the teamId)
            const team = await this.teamService.create({
                ...req.body,
                foundedYear: req.body.foundedYear ? Number(req.body.foundedYear) : undefined,
            });

            // 2. If a logo was uploaded, move it from temp → uploads/teams/{teamId}/logo/
            if (tempFile) {
                const logoUrl = moveLogoToTeamFolder(tempFile.path, team.id.toString());
                await this.teamService.updateLogoUrl(team.id.toString(), logoUrl);
                team.logoUrl = logoUrl;
            }

            res.status(201).json(team);
        } catch (error: any) {
            // Clean up temp file on failure
            if (tempFile && fs.existsSync(tempFile.path)) {
                fs.unlinkSync(tempFile.path);
            }
            console.error("Create team error:", error);
            res.status(500).json({ message: "Failed to create team", error: error?.message ?? String(error) });
        }
    };

    // ── Gallery ────────────────────────────────────────────────────────────────

    getGallery = async (req: Request, res: Response) => {
        try {
            const teamId = req.params['teamId'] as string;
            const urls = getTeamGalleryUrls(teamId);
            res.json({ teamId, photos: urls });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to list gallery", error: error?.message });
        }
    };

    uploadGallery = async (req: Request, res: Response) => {
        try {
            const teamId = req.params['teamId'] as string;
            const files = (req as any).files as Express.Multer.File[] | undefined;
            if (!files || files.length === 0) {
                return res.status(400).json({ message: "No photos uploaded" });
            }
            const urls = files.map(f => `/uploads/teams/${teamId}/gallery/${path.basename(f.path)}`);
            res.status(201).json({ teamId, uploaded: urls.length, photos: urls });
        } catch (error: any) {
            console.error("Gallery upload error:", error);
            res.status(500).json({ message: "Failed to upload gallery photos", error: error?.message });
        }
    };

    deleteGalleryPhoto = async (req: Request, res: Response) => {
        try {
            const teamId = req.params['teamId'] as string;
            const filename = req.params['filename'] as string;
            // Prevent path traversal
            const safeName = path.basename(filename);
            const filePath = path.join(process.cwd(), "uploads", "teams", teamId, "gallery", safeName);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: "Photo not found" });
            }
            fs.unlinkSync(filePath);
            res.json({ message: "Photo deleted" });
        } catch (error: any) {
            res.status(500).json({ message: "Failed to delete photo", error: error?.message });
        }
    };

    update = async (req: Request, res: Response) => {
        const teamId = req.params['id'] as string;
        const tempFile = (req as any).file as Express.Multer.File | undefined;
        try {
            // 1. Update basic info first
            const updatedTeam = await this.teamService.update(teamId, {
                ...req.body,
                foundedYear: req.body.foundedYear ? Number(req.body.foundedYear) : undefined,
            });

            if (!updatedTeam) {
                return res.status(404).json({ message: "Team not found" });
            }

            // 2. If a new logo was uploaded, move it from temp → uploads/teams/{teamId}/logo/
            if (tempFile) {
                const logoUrl = moveLogoToTeamFolder(tempFile.path, teamId);
                await this.teamService.updateLogoUrl(teamId, logoUrl);
                updatedTeam.logoUrl = logoUrl;
            }

            res.json(updatedTeam);
        } catch (error: any) {
            // Clean up temp file on failure
            if (tempFile && fs.existsSync(tempFile.path)) {
                fs.unlinkSync(tempFile.path);
            }
            console.error("Update team error:", error);
            res.status(500).json({ message: "Failed to update team", error: error?.message ?? String(error) });
        }
    };
}
