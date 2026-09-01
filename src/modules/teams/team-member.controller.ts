import { Request, Response } from "express";
import { TeamMemberService } from "./team-member.service";

export class TeamMemberController {
    private memberService = new TeamMemberService();

    getByTeamId = async (req: Request, res: Response) => {
        try {
            const members = await this.memberService.getByTeamId(req.params.teamId as string);
            res.json(members);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch team members", error });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const { planRestrictionService } = require("../plans/planRestriction.service");
            await planRestrictionService.assertCanAddMember((req as any).user, req.body?.role);

            const member = await this.memberService.create(req.params.teamId as string, req.body);
            res.status(201).json(member);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || "Failed to add team member", error: error.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const member = await this.memberService.update(req.params.id as string, req.body);
            if (!member) {
                return res.status(404).json({ message: "Team member not found" });
            }
            res.json(member);
        } catch (error) {
            res.status(500).json({ message: "Failed to update team member", error });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            await this.memberService.delete(req.params.id as string);
            res.json({ message: "Team member removed" });
        } catch (error) {
            res.status(500).json({ message: "Failed to remove team member", error });
        }
    };

    /**
     * Store a member photo and return its public URL. Kept separate from
     * create/update so those stay JSON (no multipart type coercion); the client
     * uploads the picked file here first, then saves the returned `photoUrl`.
     */
    uploadPhoto = async (req: Request, res: Response) => {
        try {
            const file = (req as any).file as Express.Multer.File | undefined;
            if (!file) {
                return res.status(400).json({ message: "No photo uploaded" });
            }
            res.status(201).json({ photoUrl: `/uploads/members/${file.filename}` });
        } catch (error) {
            res.status(500).json({ message: "Failed to upload member photo", error });
        }
    };
}
