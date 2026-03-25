import { AppDataSource } from "../../../config/data-source";
import { TournamentVenue } from "./venue.entity";
import { Tournament } from "../tournament.entity";

export class VenueService {
    private venueRepository = AppDataSource.getRepository(TournamentVenue);
    private tournamentRepository = AppDataSource.getRepository(Tournament);

    async upsertVenue(tournamentId: number, data: Partial<TournamentVenue>): Promise<TournamentVenue> {
        const tournament = await this.tournamentRepository.findOneBy({ id: tournamentId });
        if (!tournament) {
            throw new Error("Tournament not found");
        }

        let venue = await this.venueRepository.findOne({
            where: { tournament: { id: tournamentId } },
            relations: ["tournament"]
        });

        if (venue) {
            this.venueRepository.merge(venue, data);
        } else {
            venue = this.venueRepository.create({
                ...data,
                tournament
            });
        }

        return await this.venueRepository.save(venue);
    }

    async getVenue(tournamentId: number): Promise<TournamentVenue | null> {
        return await this.venueRepository.findOne({
            where: { tournament: { id: tournamentId } }
        });
    }
}
