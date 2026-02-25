import { AppDataSource } from "../../config/data-source";
import { Team } from "./team.entity";
import { Like } from "typeorm";

export class TeamService {
    private teamRepository = AppDataSource.getRepository(Team);

    async getAll(search?: string) {
        if (search) {
            return this.teamRepository.find({
                where: { name: Like(`%${search}%`) },
                relations: ["tournament"],
                order: { createdAt: "DESC" }
            });
        }
        return this.teamRepository.find({
            relations: ["tournament"],
            order: { createdAt: "DESC" }
        });
    }

    async getById(id: string) {
        return this.teamRepository.findOne({
            where: { id },
            relations: ["tournament"]
        });
    }

    async create(data: Partial<Team>) {
        const team = this.teamRepository.create(data);
        return this.teamRepository.save(team);
    }

    async updateLogoUrl(id: string, logoUrl: string) {
        await this.teamRepository.update(id, { logoUrl });
    }
}
