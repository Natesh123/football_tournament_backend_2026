import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "./tournament.entity";
import { TournamentTeam, TeamStatus, TeamPaymentStatus } from "./tournament-team.entity";
import { Team } from "../teams/team.entity";
import { saveBase64Image } from "../../utils/image-upload.utils";

const tournamentRepo = AppDataSource.getRepository(Tournament);
const tournamentTeamRepo = AppDataSource.getRepository(TournamentTeam);
const teamRepo = AppDataSource.getRepository(Team);

export const TournamentService = {
    async findAll(): Promise<Tournament[]> {
        return tournamentRepo.find({
            order: { createdAt: "DESC" },
            relations: ["organizer", "format"]
        });
    },

    async findById(id: string): Promise<Tournament | null> {
        return tournamentRepo.findOne({
            where: { id },
            relations: ["organizer", "format"]
        });
    },

    async create(data: Partial<Tournament>): Promise<Tournament> {
        const tournament = tournamentRepo.create({
            name: data.name,
            description: data.description || "",
            startDate: data.startDate,
            endDate: data.endDate,
            maxTeams: data.maxTeams || 16,
            status: data.status || TournamentStatus.DRAFT,
            shortName: data.shortName,
            type: data.type,
            visibility: data.visibility,
            sponsors: data.sponsors,
            participantType: data.participantType,
            minTeams: data.minTeams,
            regOpenDate: data.regOpenDate,
            regCloseDate: data.regCloseDate,
            approvalRequired: data.approvalRequired !== undefined ? data.approvalRequired : false,
            regFee: data.regFee || 0,
            playerLimit: data.playerLimit,
            squadSize: data.squadSize,
        });

        if (data.format) {
            tournament.format = data.format as any;
        }

        if (data.logo) {
            tournament.logo = saveBase64Image(data.logo, 'tournaments');
        }
        if (data.coverImage) {
            tournament.coverImage = saveBase64Image(data.coverImage, 'tournaments');
        }
        if (data.organizer) {
            tournament.organizer = data.organizer as any;
        }

        return tournamentRepo.save(tournament);
    },

    async update(id: string, data: Partial<Tournament>): Promise<Tournament | null> {
        const tournament = await tournamentRepo.findOne({
            where: { id },
            relations: ["organizer", "format"]
        });
        if (!tournament) return null;

        // Assign basic flat fields
        if (data.name !== undefined) tournament.name = data.name;
        if (data.description !== undefined) tournament.description = data.description;
        if (data.startDate !== undefined) tournament.startDate = data.startDate;
        if (data.endDate !== undefined) tournament.endDate = data.endDate;
        if (data.maxTeams !== undefined) tournament.maxTeams = data.maxTeams;
        if (data.status !== undefined) tournament.status = data.status;
        if (data.shortName !== undefined) tournament.shortName = data.shortName;
        if (data.type !== undefined) tournament.type = data.type;
        if (data.visibility !== undefined) tournament.visibility = data.visibility;
        if (data.sponsors !== undefined) tournament.sponsors = data.sponsors;

        if (data.participantType !== undefined) tournament.participantType = data.participantType;
        if (data.minTeams !== undefined) tournament.minTeams = data.minTeams;
        if (data.regOpenDate !== undefined) tournament.regOpenDate = data.regOpenDate;
        if (data.regCloseDate !== undefined) tournament.regCloseDate = data.regCloseDate;
        if (data.approvalRequired !== undefined) tournament.approvalRequired = data.approvalRequired;
        if (data.regFee !== undefined) tournament.regFee = data.regFee;
        if (data.playerLimit !== undefined) tournament.playerLimit = data.playerLimit;
        if (data.squadSize !== undefined) tournament.squadSize = data.squadSize;

        // Handle images
        if (data.logo && data.logo.startsWith('data:image')) {
            tournament.logo = saveBase64Image(data.logo, 'tournaments');
        } else if (data.logo !== undefined) {
            tournament.logo = data.logo; // Keep existing path if not base64
        }

        if (data.coverImage && data.coverImage.startsWith('data:image')) {
            tournament.coverImage = saveBase64Image(data.coverImage, 'tournaments');
        } else if (data.coverImage !== undefined) {
            tournament.coverImage = data.coverImage;
        }

        if (data.organizer) {
            tournament.organizer = { ...tournament.organizer, ...data.organizer } as any;
        }

        if (data.format) {
            tournament.format = { ...tournament.format, ...data.format } as any;
        }

        return tournamentRepo.save(tournament);
    },

    async remove(id: string): Promise<boolean> {
        const result = await tournamentRepo.delete(id);
        return (result.affected ?? 0) > 0;
    },

    // --- Team Registrations ---

    async getTeams(tournamentId: string): Promise<TournamentTeam[]> {
        return tournamentTeamRepo.find({
            where: { tournament: { id: tournamentId } },
            relations: ["team"],
            order: { createdAt: "DESC" }
        });
    },

    async addTeam(tournamentId: string, teamId: string): Promise<TournamentTeam | null> {
        const tournament = await tournamentRepo.findOneBy({ id: tournamentId });
        const team = await teamRepo.findOneBy({ id: teamId });

        if (!tournament || !team) return null;

        // Check if already registered
        const existing = await tournamentTeamRepo.findOne({
            where: { tournament: { id: tournamentId }, team: { id: teamId } }
        });

        if (existing) return existing;

        const registration = tournamentTeamRepo.create({
            tournament,
            team,
            status: TeamStatus.PENDING,
            paymentStatus: TeamPaymentStatus.PENDING,
        });

        return tournamentTeamRepo.save(registration);
    },

    async updateTeamStatus(tournamentId: string, teamId: string, status?: TeamStatus, paymentStatus?: TeamPaymentStatus): Promise<TournamentTeam | null> {
        const registration = await tournamentTeamRepo.findOne({
            where: { tournament: { id: tournamentId }, team: { id: teamId } }
        });

        if (!registration) return null;

        if (status) registration.status = status;
        if (paymentStatus) registration.paymentStatus = paymentStatus;

        return tournamentTeamRepo.save(registration);
    },

    async removeTeam(tournamentId: string, teamId: string): Promise<boolean> {
        const result = await tournamentTeamRepo.delete({
            tournament: { id: tournamentId },
            team: { id: teamId }
        });
        return (result.affected ?? 0) > 0;
    }
};
