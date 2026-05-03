import { TournamentService } from "./tournament.service";
import { TournamentEngineService } from "./tournament-engine.service";

const engineService = new TournamentEngineService();

export const TournamentController = {
    async getAll(req: any, res: any) {
        try {
            const tournaments = await TournamentService.findAll(req.user);
            res.json({ success: true, data: tournaments });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getById(req: any, res: any) {
        try {
            const tournament = await TournamentService.findById(req.params.id as string);
            if (!tournament) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async seedResults(req: any, res: any) {
        try {
            const { AppDataSource } = require("../../config/data-source");
            const { Match, MatchStatus } = require("../matches/match.entity");
            const { MatchEvent, MatchEventType, MatchEventTeamSide } = require("../matches/match-event.entity");

            const matchRepo = AppDataSource.getRepository(Match);
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            const tournamentId = req.params.id;

            const matches = await matchRepo.find({
                where: { tournament: { id: parseInt(tournamentId) } },
                relations: ["homeTeam", "awayTeam", "stage", "group"],
                take: 3
            });

            if (matches.length < 3) {
                return res.status(400).json({ success: false, message: "Not enough scheduled matches. Generate structure first." });
            }

            // Match 1: Regular Win
            if (matches[0].homeTeam && matches[0].awayTeam) {
                matches[0].status = MatchStatus.COMPLETED;
                matches[0].homeScore = 2;
                matches[0].awayScore = 0;
                matches[0].endPeriod = "ft";
                await matchRepo.save(matches[0]);

                await eventRepo.save([
                    eventRepo.create({ match: matches[0], type: MatchEventType.GOAL, minute: 15, playerName: "Lionel Messi", teamSide: MatchEventTeamSide.HOME, team: matches[0].homeTeam }),
                    eventRepo.create({ match: matches[0], type: MatchEventType.GOAL, minute: 67, playerName: "Andres Iniesta", teamSide: MatchEventTeamSide.HOME, team: matches[0].homeTeam }),
                    eventRepo.create({ match: matches[0], type: "yellow_card", minute: 42, playerName: "Sergio Busquets", teamSide: MatchEventTeamSide.HOME, team: matches[0].homeTeam })
                ]);
            }

            // Match 2: PSO Win
            if (matches[1].homeTeam && matches[1].awayTeam) {
                matches[1].status = MatchStatus.COMPLETED;
                matches[1].homeScore = 1;
                matches[1].awayScore = 1;
                matches[1].endPeriod = "pso";
                matches[1].penaltyHome = 3;
                matches[1].penaltyAway = 4;
                await matchRepo.save(matches[1]);

                await eventRepo.save([
                    eventRepo.create({ match: matches[1], type: MatchEventType.GOAL, minute: 45, playerName: "Marcus Rashford", teamSide: MatchEventTeamSide.HOME, team: matches[1].homeTeam }),
                    eventRepo.create({ match: matches[1], type: MatchEventType.GOAL, minute: 89, playerName: "Kevin De Bruyne", teamSide: MatchEventTeamSide.AWAY, team: matches[1].awayTeam }),
                    eventRepo.create({ match: matches[1], type: "yellow_card", minute: 30, playerName: "Casemiro", teamSide: MatchEventTeamSide.HOME, team: matches[1].homeTeam }),
                    eventRepo.create({ match: matches[1], type: "red_card", minute: 75, playerName: "Pepe", teamSide: MatchEventTeamSide.AWAY, team: matches[1].awayTeam })
                ]);
            }

            // Match 3: AET
            if (matches[2].homeTeam && matches[2].awayTeam) {
                matches[2].status = MatchStatus.COMPLETED;
                matches[2].homeScore = 3;
                matches[2].awayScore = 2;
                matches[2].endPeriod = "aet";
                await matchRepo.save(matches[2]);

                await eventRepo.save([
                    eventRepo.create({ match: matches[2], type: MatchEventType.GOAL, minute: 10, playerName: "Vinicius Jr", teamSide: MatchEventTeamSide.HOME, team: matches[2].homeTeam }),
                    eventRepo.create({ match: matches[2], type: MatchEventType.GOAL, minute: 90, playerName: "Erling Haaland", teamSide: MatchEventTeamSide.AWAY, team: matches[2].awayTeam }),
                    eventRepo.create({ match: matches[2], type: MatchEventType.GOAL, minute: 110, playerName: "Jude Bellingham", teamSide: MatchEventTeamSide.HOME, team: matches[2].homeTeam }),
                    eventRepo.create({ match: matches[2], type: "yellow_card", minute: 55, playerName: "Luka Modric", teamSide: MatchEventTeamSide.HOME, team: matches[2].homeTeam })
                ]);
            }

            res.json({ success: true, message: "Sample data seeded successfully!" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async create(req: any, res: any) {
        try {
            const { name, description, startDate, endDate, maxTeams, status, shortName, type, visibility, sponsors, logo, coverImage, organizer, participantType, minTeams, regOpenDate, regCloseDate, approvalRequired, regFee, playerLimit, squadSize } = req.body;

            if (!name || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Name, start date, and end date are required",
                });
            }

            const tournament = await TournamentService.create({
                ownerId: req.user?.id,
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                maxTeams: maxTeams || 16,
                status,
                shortName,
                type,
                visibility,
                sponsors,
                logo,
                coverImage,
                organizer,
                participantType,
                minTeams,
                regOpenDate: regOpenDate ? new Date(regOpenDate) : undefined,
                regCloseDate: regCloseDate ? new Date(regCloseDate) : undefined,
                approvalRequired,
                regFee,
                playerLimit,
                squadSize,
            });

            res.status(201).json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async update(req: any, res: any) {
        try {
            const tournament = await TournamentService.update(req.params.id as string, req.body);
            if (!tournament) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, data: tournament });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async remove(req: any, res: any) {
        try {
            const deleted = await TournamentService.remove(req.params.id as string);
            if (!deleted) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }
            res.json({ success: true, message: "Tournament deleted" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- Team Registrations ---

    async getTeams(req: any, res: any) {
        try {
            const teams = await TournamentService.getTeams(req.params.id as string);
            res.json({ success: true, data: teams });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async addTeam(req: any, res: any) {
        try {
            const data = await TournamentService.addTeam(req.params.id as string, req.params.teamId as string);
            if (!data) return res.status(404).json({ success: false, message: "Tournament or Team not found" });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async addTeamsBulk(req: any, res: any) {
        try {
            const { teamIds } = req.body;
            if (!teamIds || !Array.isArray(teamIds)) {
                return res.status(400).json({ success: false, message: "teamIds array is required" });
            }

            const results = [];
            for (const teamId of teamIds) {
                const data = await TournamentService.addTeam(req.params.id as string, teamId.toString());
                if (data) {
                    results.push(data);
                }
            }
            res.json({ success: true, data: results });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateTeamStatus(req: any, res: any) {
        try {
            const { status, paymentStatus } = req.body;
            const data = await TournamentService.updateTeamStatus(req.params.id as string, req.params.teamId as string, status, paymentStatus);
            if (!data) return res.status(404).json({ success: false, message: "Registration not found" });
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async removeTeam(req: any, res: any) {
        try {
            const deleted = await TournamentService.removeTeam(req.params.id as string, req.params.teamId as string);
            if (!deleted) {
                return res.status(404).json({ success: false, message: "Registration not found" });
            }
            res.json({ success: true, message: "Team removed from tournament" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- Tournament Engine ---

    async generateStructure(req: any, res: any) {
        try {
            console.log("[Tournament Controller] Generate Structure payload:", req.body);
            const structure = await engineService.generateStructure(req.params.id as string, req.body);
            res.json({ success: true, data: structure });
        } catch (error: any) {
            console.error("[Tournament Controller] Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getStructure(req: any, res: any) {
        try {
            const structure = await engineService.getStructure(req.params.id as string);
            res.json({ success: true, data: structure });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
