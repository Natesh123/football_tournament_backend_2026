import { AppDataSource } from "../../config/data-source";
import { Sponsor } from "../../entities/sponsor.entity";
import { Like } from "typeorm";
import fs from 'fs';
import path from 'path';

export class SponsorsService {
    private sponsorRepository = AppDataSource.getRepository(Sponsor);

    async getAll(query: { search?: string, status?: string }) {
        const sponsors = await this.sponsorRepository
            .createQueryBuilder("sponsor")
            .leftJoinAndSelect("sponsor.tournamentSponsors", "ts")
            .leftJoinAndSelect("ts.tournament", "tournament")
            .where(query.search ? "sponsor.name LIKE :search" : "1=1", { search: `%${query.search}%` })
            .andWhere(query.status ? "sponsor.status = :status" : "1=1", { status: query.status })
            .orderBy("sponsor.display_order", "ASC")
            .addOrderBy("sponsor.name", "ASC")
            .getMany();

        return sponsors.map(s => {
            const tournamentNames = s.tournamentSponsors 
                ? s.tournamentSponsors.map(ts => ts.tournament?.name).filter(Boolean)
                : [];
            
            return {
                ...s,
                totalTournaments: tournamentNames.length,
                tournamentNames: tournamentNames
            };
        });
    }

    async getOne(id: number) {
        return await this.sponsorRepository.findOneBy({ id });
    }

    async create(data: any) {
        const sponsor = this.sponsorRepository.create(data);
        return await this.sponsorRepository.save(sponsor);
    }

    async update(id: number, data: any) {
        const sponsor = await this.sponsorRepository.findOneBy({ id });
        if (!sponsor) throw new Error("Sponsor not found");

        // If a new logo is uploaded, we might want to delete the old one,
        // but let's keep it simple for now and just update the record.
        Object.assign(sponsor, data);
        return await this.sponsorRepository.save(sponsor);
    }

    async delete(id: number) {
        const sponsor = await this.sponsorRepository.findOneBy({ id });
        if (!sponsor) throw new Error("Sponsor not found");

        // Delete logo file if it exists
        if (sponsor.logo) {
            const logoPath = path.join(process.cwd(), sponsor.logo);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
            }
        }

        return await this.sponsorRepository.remove(sponsor);
    }
}
