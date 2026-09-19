import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { Plan } from "../plans/plan.entity";
import { Tournament, TournamentStatus } from "../tournaments/tournament.entity";
import { notificationService } from "../notifications/notification.service";
import { planRestrictionService } from "../plans/planRestriction.service";

export class UserPlanService {
    private userRepo = AppDataSource.getRepository(User);
    private planRepo = AppDataSource.getRepository(Plan);
    private tournamentRepo = AppDataSource.getRepository(Tournament);

    /**
     * Fetch user's current plan details, active tournaments, and available plans.
     */
    async getMyPlanDetails(user: any) {
        const currentUser = await this.userRepo.findOneBy({ id: user.id });
        const currentPlanName = currentUser?.plan || user?.plan || "Free";

        const planInfo = await planRestrictionService.getUserPlanInfo(user);

        // Fetch active/pending/in-progress tournaments for this user
        const tournaments = await this.tournamentRepo.find({
            where: { ownerId: user.id },
            order: { createdAt: "DESC" }
        });

        const activeTournaments = tournaments.filter(
            t => t.status !== TournamentStatus.COMPLETED
        );

        // Fetch all active plans visible to users
        const allPlans = await this.planRepo.find({
            where: { status: "active" },
            order: { displayOrder: "ASC", monthlyPrice: "ASC" }
        });

        // Check if there is a pending plan update notification for this user
        const userNotifs = await notificationService.getNotifications({
            userId: user.id,
            type: "plan_update"
        });

        let pendingPlanName: string | null = null;
        if (userNotifs && userNotifs.length > 0 && userNotifs[0].status === "pending") {
            const lastNotif = userNotifs[0];
            if (lastNotif.referenceId) {
                const targetPlan = allPlans.find(p => p.id === lastNotif.referenceId);
                if (targetPlan) pendingPlanName = targetPlan.name;
            }
        }

        return {
            currentPlanName,
            pendingPlanName,
            planInfo,
            activeTournaments: activeTournaments.map(t => ({
                id: t.id,
                name: t.name,
                status: t.status,
                startDate: t.startDate,
                endDate: t.endDate
             })),
            allTournamentsCount: tournaments.length,
            plans: allPlans
        };
    }

    /**
     * Request a plan update. Checks for pending or in-progress tournaments.
     */
    async requestPlanUpdate(user: any, targetPlanName: string) {
        if (!targetPlanName) {
            const err: any = new Error("Plan name is required.");
            err.status = 400;
            throw err;
        }

        // Validate plan existence
        const targetPlan = await this.planRepo.createQueryBuilder("p")
            .where("LOWER(p.name) = LOWER(:p) OR LOWER(p.code) = LOWER(:p)", { p: targetPlanName })
            .getOne();

        if (!targetPlan) {
            const err: any = new Error(`Plan '${targetPlanName}' not found.`);
            err.status = 404;
            throw err;
        }

        const currentUser = await this.userRepo.findOneBy({ id: user.id });
        if (!currentUser) {
            const err: any = new Error("User not found.");
            err.status = 404;
            throw err;
        }

        const currentPlanName = (currentUser.plan || "Free").trim();
        if (currentPlanName.toLowerCase() === targetPlan.name.toLowerCase()) {
            return {
                success: false,
                blocked: false,
                alreadyActive: true,
                status: "Current",
                message: `You are already subscribed to the "${targetPlan.name}" plan.`,
                planName: targetPlan.name
            };
        }

        // Check active tournaments
        const userTournaments = await this.tournamentRepo.find({
            where: { ownerId: user.id }
        });

        const pendingOrInProgress = userTournaments.filter(
            t => t.status !== TournamentStatus.COMPLETED
        );

        const userNameOrEmail = currentUser.user_name || currentUser.email;

        // CASE 1: Pending or In-Progress Tournament Exists -> BLOCK
        if (pendingOrInProgress.length > 0) {
            const tournamentDetailsStr = pendingOrInProgress
                .map(t => `"${t.name}" (Status: ${t.status.replace(/_/g, ' ')})`)
                .join(", ");

            const blockMessage = `Your plan update to "${targetPlan.name}" was blocked because you have pending/in-progress tournament(s): ${tournamentDetailsStr}. Please complete all existing tournaments before changing your plan.`;

            // Create notification record in database
            await notificationService.createNotification({
                userId: user.id,
                type: "plan_update",
                title: "Plan Update Blocked",
                message: blockMessage,
                referenceId: targetPlan.id,
                referenceType: "plan",
                status: "pending"
            });

            return {
                success: false,
                blocked: true,
                status: "Pending",
                message: blockMessage,
                activeTournaments: pendingOrInProgress.map(t => ({
                    id: t.id,
                    name: t.name,
                    status: t.status
                }))
            };
        }

        // CASE 2: No Pending/In-Progress Tournaments -> ALLOW & COMPLETE UPDATE
        currentUser.plan = targetPlan.name;
        await this.userRepo.save(currentUser);

        const successMessage = `Plan update requested by ${userNameOrEmail} has been processed. Current plan is now updated to "${targetPlan.name}".`;

        // Create completion notification
        await notificationService.createNotification({
            userId: user.id,
            type: "plan_update",
            title: "Plan Updated Successfully",
            message: successMessage,
            referenceId: targetPlan.id,
            referenceType: "plan",
            status: "completed"
        });

        return {
            success: true,
            blocked: false,
            status: "Completed",
            message: `Your plan has been successfully updated to ${targetPlan.name}.`,
            planName: targetPlan.name,
            user: {
                id: currentUser.id,
                email: currentUser.email,
                user_name: currentUser.user_name,
                plan: currentUser.plan
            }
        };
    }
}

export const userPlanService = new UserPlanService();
