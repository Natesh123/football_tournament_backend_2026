import { AppDataSource } from "../../../config/data-source";
import { TournamentPresentation } from "./presentation.entity";
import { Tournament } from "../tournament.entity";

export class PresentationService {
    private presentationRepo = AppDataSource.getRepository(TournamentPresentation);
    private tournamentRepo = AppDataSource.getRepository(Tournament);

    async upsertPresentation(tournamentId: number, data: Partial<TournamentPresentation>): Promise<TournamentPresentation> {
        const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
        if (!tournament) {
            throw new Error("Tournament not found");
        }

        let presentation = await this.presentationRepo.findOne({
            where: { tournament: { id: tournamentId } },
            relations: ["tournament"]
        });

        if (presentation) {
            this.presentationRepo.merge(presentation, data);
        } else {
            presentation = this.presentationRepo.create({
                ...data,
                tournament
            });
        }

        return await this.presentationRepo.save(presentation);
    }

    async getPresentation(tournamentId: number): Promise<TournamentPresentation | null> {
        return await this.presentationRepo.findOne({
            where: { tournament: { id: tournamentId } }
        });
    }
}
