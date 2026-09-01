import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { Plan } from "./plan.entity";
import { Tournament } from "../tournaments/tournament.entity";
import { Team } from "../teams/team.entity";
import { TeamMember, TeamMemberRole } from "../teams/team-member.entity";
import { isAdminUser } from "../auth/auth.middleware";

export interface UserPlanInfo {
    planName: string;
    maxTournaments: number;
    maxTeams: number;
    maxPlayers: number;
    maxStaff: number;
    allowOnlineRegistration: boolean;
    allowPayment: boolean;
    reportsLevel: string;
    allowCustomBranding: boolean;
}

export class PlanRestrictionService {
    private userRepo = AppDataSource.getRepository(User);
    private planRepo = AppDataSource.getRepository(Plan);
    private tournamentRepo = AppDataSource.getRepository(Tournament);
    private teamRepo = AppDataSource.getRepository(Team);
    private memberRepo = AppDataSource.getRepository(TeamMember);

    /**
     * Resolves the full active Plan features for a given user.
     */
    async getUserPlanInfo(user: any): Promise<UserPlanInfo> {
        const planName = user?.plan || "Free";
        const dbPlan = await this.planRepo.createQueryBuilder("p")
            .where("LOWER(p.name) = LOWER(:p) OR LOWER(p.code) = LOWER(:p)", { p: planName })
            .getOne();

        if (dbPlan) {
            return {
                planName: dbPlan.name,
                maxTournaments: dbPlan.maxTournaments,
                maxTeams: dbPlan.maxTeams,
                maxPlayers: dbPlan.maxPlayers,
                maxStaff: dbPlan.maxStaff,
                allowOnlineRegistration: dbPlan.allowOnlineRegistration,
                allowPayment: dbPlan.allowPayment,
                reportsLevel: dbPlan.reportsLevel || "Basic",
                allowCustomBranding: dbPlan.allowCustomBranding
            };
        }

        // Default Fallbacks matching requirements
        const isBasic = planName.toLowerCase() === "basic";
        const isPremium = planName.toLowerCase() === "premium";

        if (isPremium) {
            return {
                planName: "Premium",
                maxTournaments: -1,
                maxTeams: -1,
                maxPlayers: -1,
                maxStaff: 20,
                allowOnlineRegistration: true,
                allowPayment: true,
                reportsLevel: "Advanced",
                allowCustomBranding: true
            };
        } else if (isBasic) {
            return {
                planName: "Basic",
                maxTournaments: 5,
                maxTeams: 30,
                maxPlayers: 500,
                maxStaff: 5,
                allowOnlineRegistration: true,
                allowPayment: true,
                reportsLevel: "Advanced",
                allowCustomBranding: false
            };
        }

        return {
            planName: "Free",
            maxTournaments: 1,
            maxTeams: 8,
            maxPlayers: 100,
            maxStaff: 1,
            allowOnlineRegistration: false,
            allowPayment: false,
            reportsLevel: "Basic",
            allowCustomBranding: false
        };
    }

    /**
     * Asserts that creating a tournament does not exceed the user's plan limit.
     */
    async assertCanCreateTournament(user: any) {
        if (!user || isAdminUser(user)) return; // Admin bypass

        const planInfo = await this.getUserPlanInfo(user);
        if (planInfo.maxTournaments === -1) return; // Unlimited

        const count = await this.tournamentRepo.count({
            where: { ownerId: user.id }
        });

        if (count >= planInfo.maxTournaments) {
            const err: any = new Error(
                `Your current plan (${planInfo.planName}) permits a maximum of ${planInfo.maxTournaments} tournament(s). You have already created ${count}. Please upgrade your plan.`
            );
            err.status = 403;
            throw err;
        }
    }

    /**
     * Asserts that creating a team does not exceed the user's plan limit.
     */
    async assertCanCreateTeam(user: any) {
        if (!user || isAdminUser(user)) return; // Admin bypass

        const planInfo = await this.getUserPlanInfo(user);
        if (planInfo.maxTeams === -1) return; // Unlimited

        // Count teams registered under tournaments owned by this organizer
        const count = await this.teamRepo.createQueryBuilder("t")
            .innerJoin("t.tournamentRegistrations", "reg")
            .innerJoin("reg.tournament", "tr")
            .where("tr.ownerId = :uid", { uid: user.id })
            .getCount();

        if (count >= planInfo.maxTeams) {
            const err: any = new Error(
                `Your current plan (${planInfo.planName}) permits a maximum of ${planInfo.maxTeams} team(s). You currently have ${count} team(s). Please upgrade your plan.`
            );
            err.status = 403;
            throw err;
        }
    }

    /**
     * Asserts that adding a team member (player or staff) does not exceed limits.
     */
    async assertCanAddMember(user: any, memberRole: string) {
        if (!user || isAdminUser(user)) return;

        const planInfo = await this.getUserPlanInfo(user);
        const roleStr = (memberRole || "").toLowerCase();

        const isStaff = roleStr === TeamMemberRole.COACH || roleStr === TeamMemberRole.MANAGER;

        if (isStaff) {
            if (planInfo.maxStaff === -1) return;
            const staffCount = await this.memberRepo.createQueryBuilder("m")
                .innerJoin("m.team", "t")
                .innerJoin("t.tournamentRegistrations", "reg")
                .innerJoin("reg.tournament", "tr")
                .where("tr.ownerId = :uid", { uid: user.id })
                .andWhere("m.role IN (:...roles)", { roles: [TeamMemberRole.COACH, TeamMemberRole.MANAGER] })
                .getCount();

            if (staffCount >= planInfo.maxStaff) {
                const err: any = new Error(
                    `Your current plan (${planInfo.planName}) permits a maximum of ${planInfo.maxStaff} staff member(s). You currently have ${staffCount}. Please upgrade your plan.`
                );
                err.status = 403;
                throw err;
            }
        } else {
            // Player role (PLAYER, CAPTAIN, VICE_CAPTAIN)
            if (planInfo.maxPlayers === -1) return;
            const playerCount = await this.memberRepo.createQueryBuilder("m")
                .innerJoin("m.team", "t")
                .innerJoin("t.tournamentRegistrations", "reg")
                .innerJoin("reg.tournament", "tr")
                .where("tr.ownerId = :uid", { uid: user.id })
                .andWhere("m.role IN (:...roles)", {
                    roles: [TeamMemberRole.PLAYER, TeamMemberRole.CAPTAIN, TeamMemberRole.VICE_CAPTAIN]
                })
                .getCount();

            if (playerCount >= planInfo.maxPlayers) {
                const err: any = new Error(
                    `Your current plan (${planInfo.planName}) permits a maximum of ${planInfo.maxPlayers} player(s). You currently have ${playerCount}. Please upgrade your plan.`
                );
                err.status = 403;
                throw err;
            }
        }
    }

    /**
     * Asserts that online registration feature is enabled for the user's plan.
     */
    async assertCanUseOnlineRegistration(user: any) {
        if (!user || isAdminUser(user)) return;

        const planInfo = await this.getUserPlanInfo(user);
        if (!planInfo.allowOnlineRegistration) {
            const err: any = new Error(
                `Online Registration is not supported on your current plan (${planInfo.planName}). Please upgrade to Basic or Premium.`
            );
            err.status = 403;
            throw err;
        }
    }

    /**
     * Asserts that payment collection feature is enabled for the user's plan.
     */
    async assertCanCollectPayment(user: any) {
        if (!user || isAdminUser(user)) return;

        const planInfo = await this.getUserPlanInfo(user);
        if (!planInfo.allowPayment) {
            const err: any = new Error(
                `Online Payment Collection is not supported on your current plan (${planInfo.planName}). Please upgrade to Basic or Premium.`
            );
            err.status = 403;
            throw err;
        }
    }

    /**
     * Asserts advanced reports access for user's plan.
     */
    async assertCanAccessAdvancedReports(user: any) {
        if (!user || isAdminUser(user)) return;

        const planInfo = await this.getUserPlanInfo(user);
        if ((planInfo.reportsLevel || "").toLowerCase() !== "advanced") {
            const err: any = new Error(
                `Advanced Reports are not available on your current plan (${planInfo.planName}). Please upgrade to Basic or Premium.`
            );
            err.status = 403;
            throw err;
        }
    }

    /**
     * Asserts custom branding feature is enabled for user's plan.
     */
    async assertCanUseCustomBranding(user: any) {
        if (!user || isAdminUser(user)) return;

        const planInfo = await this.getUserPlanInfo(user);
        if (!planInfo.allowCustomBranding) {
            const err: any = new Error(
                `Custom Branding is only available on the Premium plan. Please upgrade your plan.`
            );
            err.status = 403;
            throw err;
        }
    }
}

export const planRestrictionService = new PlanRestrictionService();
