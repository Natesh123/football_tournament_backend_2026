import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "./tournament.entity";

const tournamentRepo = AppDataSource.getRepository(Tournament);

export const TournamentService = {
    async findAll(): Promise<Tournament[]> {
        return tournamentRepo.find({ order: { createdAt: "DESC" } });
    },

    async findById(id: string): Promise<Tournament | null> {
        return tournamentRepo.findOne({ where: { id } });
    },

    async create(data: Partial<Tournament>): Promise<Tournament> {
        const tournament = tournamentRepo.create({
            name: data.name,
            description: data.description || "",
            startDate: data.startDate,
            endDate: data.endDate,
            maxTeams: data.maxTeams || 16,
            status: data.status || TournamentStatus.DRAFT,
        });
        return tournamentRepo.save(tournament);
    },

    async update(id: string, data: Partial<Tournament>): Promise<Tournament | null> {
        const tournament = await tournamentRepo.findOne({ where: { id } });
        if (!tournament) return null;
        Object.assign(tournament, data);
        return tournamentRepo.save(tournament);
    },

    async remove(id: string): Promise<boolean> {
        const result = await tournamentRepo.delete(id);
        return (result.affected ?? 0) > 0;
    },
};
