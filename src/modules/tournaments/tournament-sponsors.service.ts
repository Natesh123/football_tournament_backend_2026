import { AppDataSource } from "../../config/data-source";
import { TournamentSponsor } from "./tournament-sponsor.entity";
import { Sponsor } from "../../entities/sponsor.entity";
import { Tournament } from "./tournament.entity";

export class TournamentSponsorsService {
    private tsRepository = AppDataSource.getRepository(TournamentSponsor);
    private sponsorRepository = AppDataSource.getRepository(Sponsor);
    private tournamentRepository = AppDataSource.getRepository(Tournament);

    async getSponsorsByTournament(tournamentId: number) {
        return await this.tsRepository.find({
            where: { tournament_id: tournamentId },
            relations: ["sponsor"],
            order: { created_at: "DESC" }
        });
    }

    async assignSponsor(tournamentId: number, sponsorId: number) {
        // Check for duplicates
        const existing = await this.tsRepository.findOneBy({
            tournament_id: tournamentId,
            sponsor_id: sponsorId
        });

        if (existing) {
            throw new Error("Sponsor is already assigned to this tournament");
        }

        const mapping = this.tsRepository.create({
            tournament_id: tournamentId,
            sponsor_id: sponsorId
        });

        return await this.tsRepository.save(mapping);
    }

    async removeSponsor(mappingId: number) {
        const mapping = await this.tsRepository.findOneBy({ id: mappingId });
        if (!mapping) throw new Error("Mapping not found");
        return await this.tsRepository.remove(mapping);
    }

    async getTournamentsBySponsor(sponsorId: number) {
        return await this.tsRepository.find({
            where: { sponsor_id: sponsorId },
            relations: ["tournament"]
        });
    }
}
