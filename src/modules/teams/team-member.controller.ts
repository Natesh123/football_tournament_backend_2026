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
            const member = await this.memberService.create(req.params.teamId as string, req.body);
            res.status(201).json(member);
        } catch (error) {
            res.status(500).json({ message: "Failed to add team member", error });
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
}
