import { AppDataSource } from "../../config/data-source";
import { Plan } from "./plan.entity";

export class PlanService {
    private planRepository = AppDataSource.getRepository(Plan);

    /** Admin listing — all plans, ordered for display. */
    async getAll(query: { search?: string; status?: string } = {}) {
        const qb = this.planRepository.createQueryBuilder("plan");

        if (query.search) {
            qb.andWhere("(plan.name LIKE :search OR plan.code LIKE :search)", { search: `%${query.search}%` });
        }
        if (query.status) {
            qb.andWhere("plan.status = :status", { status: query.status });
        }

        return qb
            .orderBy("plan.displayOrder", "ASC")
            .addOrderBy("plan.monthlyPrice", "ASC")
            .getMany();
    }

    async getOne(id: number) {
        return this.planRepository.findOneBy({ id });
    }

    async create(data: Partial<Plan>) {
        await this.assertUniqueCode(data.code);
        const plan = this.planRepository.create(this.normalize(data));
        return this.planRepository.save(plan);
    }

    async update(id: number, data: Partial<Plan>) {
        const plan = await this.planRepository.findOneBy({ id });
        if (!plan) throw new Error("Plan not found");
        await this.assertUniqueCode(data.code, id);
        Object.assign(plan, this.normalize(data));
        return this.planRepository.save(plan);
    }

    async delete(id: number) {
        const plan = await this.planRepository.findOneBy({ id });
        if (!plan) throw new Error("Plan not found");
        return this.planRepository.remove(plan);
    }

    /**
     * Public landing feed: only active + landing-visible plans, ordered by the
     * admin-configured display order, capped at 5.
     */
    async getPublicPlans() {
        return this.planRepository.find({
            where: { status: "active", landingVisible: true },
            order: { displayOrder: "ASC", monthlyPrice: "ASC" },
            take: 5,
        });
    }

    /** Reject a duplicate code (case-insensitive), optionally excluding one id. */
    private async assertUniqueCode(code?: string, excludeId?: number) {
        const trimmed = code?.trim();
        if (!trimmed) return;
        const existing = await this.planRepository
            .createQueryBuilder("plan")
            .where("LOWER(plan.code) = LOWER(:code)", { code: trimmed })
            .getOne();
        if (existing && existing.id !== excludeId) {
            const err: any = new Error("A plan with this code already exists.");
            err.status = 409;
            throw err;
        }
    }

    /** Coerce incoming form values to the shapes the column types expect. */
    private normalize(data: Partial<Plan>): Partial<Plan> {
        const out: any = { ...data };
        if (out.code) out.code = String(out.code).trim();
        if (out.features !== undefined && !Array.isArray(out.features)) {
            // Accept a newline/comma separated string from simple forms.
            out.features = String(out.features)
                .split(/\r?\n|,/)
                .map((f: string) => f.trim())
                .filter(Boolean);
        }
        return out;
    }
}
