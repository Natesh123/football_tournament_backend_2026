import { AppDataSource } from "../../../config/data-source";
import { TournamentFinance } from "./finance.entity";
import { TournamentPrizePool } from "./prize-pool.entity";
import { Tournament } from "../tournament.entity";

export class FinanceService {
    private financeRepo = AppDataSource.getRepository(TournamentFinance);
    private prizePoolRepo = AppDataSource.getRepository(TournamentPrizePool);
    private tournamentRepo = AppDataSource.getRepository(Tournament);

    async upsertFinance(
        tournamentId: number, 
        financeData: Partial<TournamentFinance>, 
        prizePoolData: Partial<TournamentPrizePool>
    ): Promise<{ finance: TournamentFinance, prizePool: TournamentPrizePool }> {
        const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
        if (!tournament) {
            throw new Error("Tournament not found");
        }



        // Upsert Finance
        let finance = await this.financeRepo.findOne({
            where: { tournament: { id: tournamentId } },
            relations: ["tournament"]
        });

        if (finance) {
            this.financeRepo.merge(finance, financeData);
        } else {
            finance = this.financeRepo.create({
                ...financeData,
                tournament
            });
        }
        finance = await this.financeRepo.save(finance);

        // Upsert Prize Pool
        let prizePool = await this.prizePoolRepo.findOne({
            where: { tournament: { id: tournamentId } },
            relations: ["tournament"]
        });

        if (prizePool) {
            this.prizePoolRepo.merge(prizePool, prizePoolData);
        } else {
            prizePool = this.prizePoolRepo.create({
                ...prizePoolData,
                tournament
            });
        }
        prizePool = await this.prizePoolRepo.save(prizePool);

        return { finance, prizePool };
    }

    async getFinance(tournamentId: number): Promise<{ finance: TournamentFinance | null, prizePool: TournamentPrizePool | null }> {
        const finance = await this.financeRepo.findOne({
            where: { tournament: { id: tournamentId } }
        });
        const prizePool = await this.prizePoolRepo.findOne({
            where: { tournament: { id: tournamentId } }
        });

        return { finance, prizePool };
    }
}
