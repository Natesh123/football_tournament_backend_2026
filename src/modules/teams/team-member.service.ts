import { AppDataSource } from "../../config/data-source";
import { TeamMember } from "./team-member.entity";
import { Team } from "./team.entity";

export class TeamMemberService {
    private memberRepository = AppDataSource.getRepository(TeamMember);
    private teamRepository = AppDataSource.getRepository(Team);

    async getByTeamId(teamId: string) {
        return this.memberRepository.find({
            where: { team: { id: parseInt(teamId) } },
            order: { name: "ASC" }
        });
    }

    async create(teamId: string, data: Partial<TeamMember>) {
        const team = await this.teamRepository.findOneBy({ id: parseInt(teamId) });
        if (!team) {
            throw new Error("Team not found");
        }

        const member = this.memberRepository.create({
            ...data,
            team
        });
        return this.memberRepository.save(member);
    }

    async delete(id: string) {
        return this.memberRepository.delete(id);
    }
}
