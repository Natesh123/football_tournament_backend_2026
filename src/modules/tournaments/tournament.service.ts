import { Not } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "./tournament.entity";
import { TournamentTeam, TeamStatus, TeamPaymentStatus } from "./tournament-team.entity";
import { Team } from "../teams/team.entity";
import { TeamMember } from "../teams/team-member.entity";
import { saveBase64Image } from "../../utils/image-upload.utils";
import { tournamentRulesService } from "./tournament-rules.service";
import { ExtraTimeRule, GoalkeeperRule, TournamentRules } from "./tournament-rules.entity";
import { VenueService } from "./venues/venue.service";
import { FinanceService } from "./finance/finance.service";
import { PresentationService } from "./presentation/presentation.service";
import { FieldType } from "./venues/venue.entity";
import { AcceptedPaymentMethod } from "./finance/finance.entity";

const venueService = new VenueService();
const financeService = new FinanceService();
const presentationService = new PresentationService();

// Helper to map frontend rules directly to the DTO
function mapRulesToDto(reqRules: any) {
    let mappedExtraTime: ExtraTimeRule | undefined;
    if (reqRules.extraTimeRule === "None") mappedExtraTime = ExtraTimeRule.NO_EXTRA_TIME;
    else if (reqRules.extraTimeRule === "2x15") mappedExtraTime = ExtraTimeRule.FULL_EXTRA_TIME;
    else if (reqRules.extraTimeRule === "Golden Goal") mappedExtraTime = ExtraTimeRule.GOLDEN_GOAL;

    let mappedGk: GoalkeeperRule | undefined;
    if (reqRules.gkRules === "Standard") mappedGk = GoalkeeperRule.STANDARD_FIFA;
    else if (reqRules.gkRules === "No Pass Back") mappedGk = GoalkeeperRule.NO_RESTRICTION;
    else if (reqRules.gkRules === "Futsal Throw") mappedGk = GoalkeeperRule.ROLLING_KEEPER;

    return {
        governingBody:        reqRules.govBody              as string | undefined, // mapped govBody
        ballSize:             reqRules.ballSize             !== undefined ? Number(reqRules.ballSize)             : undefined,
        playersOnField:       reqRules.playersOnField       !== undefined ? Number(reqRules.playersOnField)       : undefined,
        minPlayers:           reqRules.minPlayers           !== undefined ? Number(reqRules.minPlayers)           : undefined,
        substitutionRules:    reqRules.subsAllowed          !== undefined ? Number(reqRules.subsAllowed)          : undefined, // mapped subsAllowed
        applyOffsideRule:     reqRules.offsideRule          !== undefined ? Boolean(reqRules.offsideRule)         : undefined, // mapped offsideRule
        extraTimeRules:       mappedExtraTime               as ExtraTimeRule | undefined, // mapped enum
        penaltiesShootout:    reqRules.penaltiesRule        !== undefined ? Boolean(reqRules.penaltiesRule)       : undefined, // mapped penaltiesRule
        yellowCardSuspension: reqRules.yellowSuspensionLimit!== undefined ? Number(reqRules.yellowSuspensionLimit): undefined, // mapped
        redCardPenalty:       reqRules.redSuspensionLength  !== undefined ? Number(reqRules.redSuspensionLength)  : undefined, // mapped
        goalkeeperRules:      mappedGk                      as GoalkeeperRule | undefined, // mapped enum
    };
}

function mapDtoToRules(rules: TournamentRules) {
    let feExtraTime = "None";
    if (rules.extraTimeRules === ExtraTimeRule.FULL_EXTRA_TIME) feExtraTime = "2x15";
    else if (rules.extraTimeRules === ExtraTimeRule.GOLDEN_GOAL) feExtraTime = "Golden Goal";

    let feGk = "Standard";
    if (rules.goalkeeperRules === GoalkeeperRule.NO_RESTRICTION) feGk = "No Pass Back";
    else if (rules.goalkeeperRules === GoalkeeperRule.ROLLING_KEEPER) feGk = "Futsal Throw";

    return {
        govBody:               rules.governingBody,
        ballSize:              rules.ballSize,
        playersOnField:        rules.playersOnField,
        minPlayers:            rules.minPlayers,
        subsAllowed:           rules.substitutionRules,
        offsideRule:           Boolean(rules.applyOffsideRule), // MySQL sometimes returns 1/0
        extraTimeRule:         feExtraTime,
        penaltiesRule:         Boolean(rules.penaltiesShootout),
        yellowSuspensionLimit: rules.yellowCardSuspension,
        redSuspensionLength:   rules.redCardPenalty,
        gkRules:               feGk
    };
}

function mapVenuesToDto(venues: any) {
    if (!venues) return {};
    let mappedFieldType = FieldType.NATURAL_GRASS;
    if (venues.fieldType === "turf") mappedFieldType = FieldType.ARTIFICIAL_TURF;
    else if (venues.fieldType === "indoor") mappedFieldType = FieldType.INDOOR;

    return {
        multipleVenuesEnabled: Boolean(venues.multipleVenues),
        primaryVenueName: venues.primaryVenue || "",
        venueAddress: venues.venueAddress || "",
        totalPitches: Number(venues.pitchCount) || 1,
        fieldType: mappedFieldType,
        pitches: venues.pitches || []
    };
}

function mapDtoToVenues(dto: any) {
    if (!dto) return undefined;
    let feFieldType = "grass";
    if (dto.fieldType === FieldType.ARTIFICIAL_TURF) feFieldType = "turf";
    else if (dto.fieldType === FieldType.INDOOR) feFieldType = "indoor";

    return {
        multipleVenues: Boolean(dto.multipleVenuesEnabled),
        primaryVenue: dto.primaryVenueName || "",
        venueAddress: dto.venueAddress || "",
        pitchCount: dto.totalPitches || 1,
        fieldType: feFieldType,
        pitches: dto.pitches || []
    };
}

function mapFinanceToDto(finance: any) {
    if (!finance) return { financeData: {}, prizePoolData: {} };
    let mappedMethod = AcceptedPaymentMethod.BANK_TRANSFER;
    if (finance.paymentMethod === "cash") mappedMethod = AcceptedPaymentMethod.CASH;
    else if (finance.paymentMethod === "card") mappedMethod = AcceptedPaymentMethod.ONLINE;
    else if (finance.paymentMethod === "mixed") mappedMethod = AcceptedPaymentMethod.UPI;

    let p1 = finance.prizeDistribution?.[0] || 0;
    let p2 = finance.prizeDistribution?.[1] || 0;
    let p3 = finance.prizeDistribution?.[2] || 0;

    return {
        financeData: {
            registrationFee: Number(finance.regFee) || 0,
            acceptedMethod: mappedMethod,
            paymentInstructions: finance.paymentInfo || ""
        },
        prizePoolData: {
            totalPrizeMoney: Number(finance.prizeMoney) || 0,
            firstPlaceAmount: p1,
            secondPlaceAmount: p2,
            thirdPlaceAmount: p3
        }
    };
}

function mapDtoToFinance(financeDto: any, prizePoolDto: any) {
    if (!financeDto) return undefined;
    let feMethod = "bank";
    if (financeDto.acceptedMethod === AcceptedPaymentMethod.CASH) feMethod = "cash";
    else if (financeDto.acceptedMethod === AcceptedPaymentMethod.ONLINE) feMethod = "card";
    else if (financeDto.acceptedMethod === AcceptedPaymentMethod.UPI) feMethod = "mixed";

    return {
        paymentMethod: feMethod,
        prizePool: prizePoolDto?.totalPrizeMoney || 0,
        prizeMoney: prizePoolDto?.totalPrizeMoney || 0,
        paymentInfo: financeDto.paymentInstructions || "",
        prizeDistribution: [
            prizePoolDto?.firstPlaceAmount || 0,
            prizePoolDto?.secondPlaceAmount || 0,
            prizePoolDto?.thirdPlaceAmount || 0
        ],
        refundPolicy: 'No Refunds',
        regFee: Number(financeDto.registrationFee) || 0
    };
}

function mapPresentationToDto(presentation: any) {
    if (!presentation) return {};
    let colorHex = "#FFC107";
    if (presentation.themeColor === "blue") colorHex = "#3B82F6";
    else if (presentation.themeColor === "red") colorHex = "#EF4444";
    else if (presentation.themeColor === "green") colorHex = "#10B981";
    
    return {
        brandColor: colorHex,
        welcomeMessage: presentation.welcomeMsg || "",
        showStandingsWidget: Boolean(presentation.showStandings),
        showTopScorers: Boolean(presentation.showTopScorers),
        liveBroadcastEnabled: Boolean(presentation.showLiveScores),
        showRecentResults: Boolean(presentation.showRecentResults),
        liveStreamLink: presentation.liveStreamLink || ""
    };
}

function mapDtoToPresentation(dto: any) {
    if (!dto) return undefined;
    let colorName = "gold";
    if (dto.brandColor === "#3B82F6") colorName = "blue";
    else if (dto.brandColor === "#EF4444") colorName = "red";
    else if (dto.brandColor === "#10B981") colorName = "green";

    return {
        themeColor: colorName,
        urlSlug: "",
        showStandings: Boolean(dto.showStandingsWidget),
        showPlayerStats: true,
        showTopScorers: Boolean(dto.showTopScorers),
        welcomeMsg: dto.welcomeMessage || "",
        showLiveScores: Boolean(dto.liveBroadcastEnabled),
        showRecentResults: Boolean(dto.showRecentResults),
        showCommentary: false,
        liveStreamLink: dto.liveStreamLink || ""
    };
}


const tournamentRepo = AppDataSource.getRepository(Tournament);
const tournamentTeamRepo = AppDataSource.getRepository(TournamentTeam);
const teamRepo = AppDataSource.getRepository(Team);
const teamMemberRepo = AppDataSource.getRepository(TeamMember);

/** A registration-integrity violation, surfaced to the client as HTTP 409. */
function conflictError(message: string): Error {
    const err = new Error(message);
    (err as any).status = 409;
    return err;
}

/** A request-validation failure, surfaced to the client as HTTP 400. */
function validationError(message: string): Error {
    const err = new Error(message);
    (err as any).status = 400;
    return err;
}

/** Fallback minimum squad size when a tournament has no explicit squadSize configured. */
const DEFAULT_MIN_TEAM_MEMBERS = 16;

/** Inclusive date-range overlap test: true when [aStart,aEnd] intersects [bStart,bEnd]. */
function datesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return new Date(aStart) <= new Date(bEnd) && new Date(bStart) <= new Date(aEnd);
}

export const TournamentService = {
    async findAll(user?: any): Promise<any[]> {
        const query = tournamentRepo.createQueryBuilder("tournament")
            .leftJoinAndSelect("tournament.organizer", "organizer")
            .leftJoinAndSelect("tournament.format", "format")
            .leftJoinAndSelect("tournament.rules", "rules")
            .orderBy("tournament.createdAt", "DESC");

        if (user) {
            const isAdmin = user.role?.toLowerCase() === 'admin' || user.roleId === 1;
            if (!isAdmin) {
                // Multivendor scoping: non-admins only see the tournaments they own.
                query.andWhere("tournament.ownerId = :userId", { userId: user.id });
            }
        }

        const tournaments = await query.getMany();
        
        return Promise.all(tournaments.map(async t => {
            const result: any = { ...t, type: t.type || '11aside' };
            result.settings = {};
            if (t.rules) {
                result.settings.rules = mapDtoToRules(t.rules);
                delete result.rules;
            }



            const venueDto = await venueService.getVenue(t.id);
            if (venueDto) result.settings.venues = mapDtoToVenues(venueDto);

            const { finance, prizePool } = await financeService.getFinance(t.id);
            if (finance) result.settings.finance = mapDtoToFinance(finance, prizePool);

            const presentationDto = await presentationService.getPresentation(t.id);
            if (presentationDto) result.settings.presentation = mapDtoToPresentation(presentationDto);

            // Merge back the JSON-persisted settings (schedule timing + wizard progress).
            const stored: any = (t as any).settings || {};
            if (stored.schedule) result.settings.schedule = stored.schedule;
            if (stored.completedTabs) result.settings.completedTabs = stored.completedTabs;

            return result;
        }));
    },

    async findById(id: string): Promise<any | null> {
        const t = await tournamentRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["organizer", "format", "rules"]
        });
        if (!t) return null;
        
        const result: any = { ...t, type: t.type || '11aside' };
        result.settings = {};
        if (t.rules) {
            result.settings.rules = mapDtoToRules(t.rules);
            delete result.rules;
        }



        const venueDto = await venueService.getVenue(t.id);
        if (venueDto) result.settings.venues = mapDtoToVenues(venueDto);

        const { finance, prizePool } = await financeService.getFinance(t.id);
        if (finance) result.settings.finance = mapDtoToFinance(finance, prizePool);

        const presentationDto = await presentationService.getPresentation(t.id);
        if (presentationDto) result.settings.presentation = mapDtoToPresentation(presentationDto);

        // Merge back the JSON-persisted settings (schedule timing + wizard progress).
        const stored: any = (t as any).settings || {};
        if (stored.schedule) result.settings.schedule = stored.schedule;
        if (stored.completedTabs) result.settings.completedTabs = stored.completedTabs;

        return result;
    },

    async create(data: Partial<Tournament>): Promise<Tournament> {
        const tournament = tournamentRepo.create({
            ownerId: data.ownerId,
            name: data.name,
            description: data.description || "",
            startDate: data.startDate,
            endDate: data.endDate,
            maxTeams: data.maxTeams || 16,
            status: data.status || TournamentStatus.DRAFT,
            shortName: data.shortName,
            type: data.type || '11aside',
            visibility: data.visibility || 'public',
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

        // Persist wizard settings with no dedicated table (schedule timing +
        // completed-tab progress) into the generic `settings` JSON column.
        if ((data as any).settings) {
            const s = (data as any).settings;
            const persisted: any = { ...(tournament.settings || {}) };
            if (s.schedule !== undefined) persisted.schedule = s.schedule;
            if (s.completedTabs !== undefined) persisted.completedTabs = s.completedTabs;
            tournament.settings = persisted;
        }

        const saved = await tournamentRepo.save(tournament);

        if ((data as any).settings) {
            const settings = (data as any).settings;
            if (settings.rules) {
                const dto = mapRulesToDto(settings.rules);
                await tournamentRulesService.saveRules(saved.id, dto);
            }
            if (settings.venues) {
                const dto = mapVenuesToDto(settings.venues);
                await venueService.upsertVenue(saved.id, dto);
            }
            if (settings.finance) {
                const { financeData, prizePoolData } = mapFinanceToDto(settings.finance);
                await financeService.upsertFinance(saved.id, financeData, prizePoolData);
            }
            if (settings.presentation) {
                const dto = mapPresentationToDto(settings.presentation);
                await presentationService.upsertPresentation(saved.id, dto);
            }

        }

        return saved;
    },

    async update(id: string, data: Partial<Tournament>): Promise<Tournament | null> {
        const tournament = await tournamentRepo.findOne({
            where: { id: parseInt(id) },
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
            const formatData = data.format as any;
            if (!tournament.format) {
                // Should not happen if relation is correctly set up, but safe fallback
                tournament.format = {
                    format_type: formatData.type || formatData.format_type || 'group',
                    format_data: formatData.format_data,
                    home_away_enabled: formatData.homeAway ?? formatData.home_away_enabled ?? false,
                    win_points: formatData.winPoints ?? formatData.win_points ?? 3,
                    draw_points: formatData.drawPoints ?? formatData.draw_points ?? 1,
                    loss_points: formatData.lossPoints ?? formatData.loss_points ?? 0
                } as any;
            } else {
                // Explicitly update fields to handle naming mismatch
                if (formatData.type !== undefined) tournament.format.format_type = formatData.type;
                else if (formatData.format_type !== undefined) tournament.format.format_type = formatData.format_type;

                if (formatData.format_data !== undefined) tournament.format.format_data = formatData.format_data;
                
                if (formatData.homeAway !== undefined) tournament.format.home_away_enabled = formatData.homeAway;
                else if (formatData.home_away_enabled !== undefined) tournament.format.home_away_enabled = formatData.home_away_enabled;

                if (formatData.winPoints !== undefined) tournament.format.win_points = formatData.winPoints;
                if (formatData.drawPoints !== undefined) tournament.format.draw_points = formatData.drawPoints;
                if (formatData.lossPoints !== undefined) tournament.format.loss_points = formatData.lossPoints;
            }
        }

        // Persist wizard settings with no dedicated table (schedule timing +
        // completed-tab progress) into the generic `settings` JSON column.
        if ((data as any).settings) {
            const s = (data as any).settings;
            const persisted: any = { ...(tournament.settings || {}) };
            if (s.schedule !== undefined) persisted.schedule = s.schedule;
            if (s.completedTabs !== undefined) persisted.completedTabs = s.completedTabs;
            tournament.settings = persisted;
        }

        const saved = await tournamentRepo.save(tournament);

        if ((data as any).settings) {
            const settings = (data as any).settings;
            if (settings.rules) {
                const dto = mapRulesToDto(settings.rules);
                await tournamentRulesService.saveRules(saved.id, dto);
            }
            if (settings.venues) {
                const dto = mapVenuesToDto(settings.venues);
                await venueService.upsertVenue(saved.id, dto);
            }
            if (settings.finance) {
                const { financeData, prizePoolData } = mapFinanceToDto(settings.finance);
                await financeService.upsertFinance(saved.id, financeData, prizePoolData);
            }
            if (settings.presentation) {
                const dto = mapPresentationToDto(settings.presentation);
                await presentationService.upsertPresentation(saved.id, dto);
            }

        }

        return saved;
    },

    async remove(id: string): Promise<boolean> {
        // Soft delete: sets deletedAt instead of removing the row, so the
        // tournament drops out of all default queries but data is preserved.
        const result = await tournamentRepo.softDelete(id);
        return (result.affected ?? 0) > 0;
    },

    /**
     * Finalize tournament setup: re-validate that every required section is complete
     * server-side, then move the tournament to REGISTRATION_OPEN. Throws a 400-tagged
     * error listing the missing sections when validation fails.
     */
    async submitTournament(id: string): Promise<Tournament> {
        const tournament = await tournamentRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["format"]
        });
        if (!tournament) {
            const err: any = new Error("Tournament not found");
            err.status = 404;
            throw err;
        }

        const missing: string[] = [];
        const name = tournament.name?.trim();
        if (!name || name === "null" || name === "New Tournament") missing.push("General (name)");
        if (!tournament.type) missing.push("General (type)");
        if (!tournament.startDate) missing.push("Schedule (start date)");
        if (!tournament.endDate) missing.push("Schedule (end date)");
        if (!tournament.minTeams || !tournament.maxTeams || tournament.minTeams > tournament.maxTeams) {
            missing.push("Participation (team limits)");
        }
        if (tournament.squadSize && tournament.playerLimit && tournament.squadSize > tournament.playerLimit) {
            missing.push("Participation (squad size range)");
        }

        const venue = await venueService.getVenue(tournament.id);
        if (!venue || !venue.primaryVenueName?.trim()) missing.push("Venues (primary venue)");

        if (!tournament.format || !(tournament.format as any).format_type) missing.push("Format");

        if (missing.length > 0) {
            const err: any = new Error(
                `Complete all required sections before submitting. Missing: ${missing.join(", ")}.`
            );
            err.status = 400;
            throw err;
        }

        tournament.status = TournamentStatus.REGISTRATION_OPEN;
        return tournamentRepo.save(tournament);
    },

    // --- Team Registrations ---

    async getTeams(tournamentId: string): Promise<TournamentTeam[]> {
        return tournamentTeamRepo.find({
            where: { tournament: { id: parseInt(tournamentId) } },
            relations: ["team"],
            order: { createdAt: "DESC" }
        });
    },

    async addTeam(tournamentId: string, teamId: string): Promise<TournamentTeam | null> {
        const tId = parseInt(tournamentId);
        const teamIdNum = parseInt(teamId);
        const tournament = await tournamentRepo.findOneBy({ id: tId });
        const team = await teamRepo.findOneBy({ id: teamIdNum });

        if (!tournament || !team) return null;

        // Check if already registered
        const existing = await tournamentTeamRepo.findOne({
            where: { tournament: { id: tId }, team: { id: teamIdNum } }
        });

        if (existing) return existing;

        // A team must field a full squad (the tournament's configured squad size) before
        // it can join. Falls back to a sane default when squadSize isn't set.
        const requiredMembers = tournament.squadSize || DEFAULT_MIN_TEAM_MEMBERS;
        const memberCount = await teamMemberRepo.count({ where: { team: { id: teamIdNum } } });
        if (memberCount < requiredMembers) {
            throw validationError(
                `Team "${team.name}" needs at least ${requiredMembers} members before it can join this tournament (currently ${memberCount}).`
            );
        }

        // A team must also not exceed the tournament's maximum squad size (playerLimit).
        // Only enforced when an explicit maximum is configured.
        if (tournament.playerLimit && memberCount > tournament.playerLimit) {
            throw validationError(
                `Team "${team.name}" exceeds the maximum squad size of ${tournament.playerLimit} for this tournament (currently ${memberCount}).`
            );
        }

        // Enforce max teams limit
        const currentCount = await tournamentTeamRepo.count({
            where: { tournament: { id: tId } }
        });
        if (currentCount >= (tournament.maxTeams || 16)) {
            throw conflictError(`Maximum team limit of ${tournament.maxTeams || 16} reached`);
        }

        // (A) A team cannot play in two tournaments that run at the same time.
        // Soft-deleted tournaments are auto-excluded by the DeleteDateColumn.
        const otherRegs = await tournamentTeamRepo.find({
            where: { team: { id: teamIdNum }, status: Not(TeamStatus.REJECTED) },
            relations: ["tournament"],
        });
        for (const reg of otherRegs) {
            const other = reg.tournament;
            if (!other || other.id === tId) continue;
            if (datesOverlap(other.startDate, other.endDate, tournament.startDate, tournament.endDate)) {
                throw conflictError(
                    `Team "${team.name}" is already registered in "${other.name}", which overlaps this tournament's dates.`
                );
            }
        }

        // (B) A player can only play for one team within a single tournament.
        // Players are matched by name (the only identifier on TeamMember).
        const incomingMembers = await teamMemberRepo.find({ where: { team: { id: teamIdNum } } });
        const incomingNames = new Set(
            incomingMembers.map((m) => m.name.trim().toLowerCase()).filter(Boolean)
        );
        if (incomingNames.size > 0) {
            const tournamentRegs = await tournamentTeamRepo.find({
                where: { tournament: { id: tId }, status: Not(TeamStatus.REJECTED) },
                relations: ["team"],
            });
            for (const reg of tournamentRegs) {
                if (!reg.team || reg.team.id === teamIdNum) continue;
                const members = await teamMemberRepo.find({ where: { team: { id: reg.team.id } } });
                for (const m of members) {
                    if (incomingNames.has(m.name.trim().toLowerCase())) {
                        throw conflictError(
                            `Player "${m.name}" already plays for "${reg.team.name}" in this tournament.`
                        );
                    }
                }
            }
        }

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
            where: { tournament: { id: parseInt(tournamentId) }, team: { id: parseInt(teamId) } }
        });

        if (!registration) return null;

        if (status) registration.status = status;
        if (paymentStatus) registration.paymentStatus = paymentStatus;

        return tournamentTeamRepo.save(registration);
    },

    async removeTeam(tournamentId: string, teamId: string): Promise<boolean> {
        const result = await tournamentTeamRepo.delete({
            tournament: { id: parseInt(tournamentId) },
            team: { id: parseInt(teamId) }
        });
        return (result.affected ?? 0) > 0;
    },

    // ─── Referees (tournament-level pool) ─────────────────────────────────────
    async getReferees(tournamentId: string): Promise<any[]> {
        const tournament = await tournamentRepo.findOneBy({ id: parseInt(tournamentId) });
        if (!tournament) return [];
        return Array.isArray(tournament.referees) ? tournament.referees : [];
    },

    async addReferee(tournamentId: string, dto: { name?: string; role?: string; phone?: string }): Promise<any> {
        const name = (dto?.name || '').trim();
        if (!name) throw validationError('Referee name is required.');

        const tournament = await tournamentRepo.findOneBy({ id: parseInt(tournamentId) });
        if (!tournament) return null;

        const referees = Array.isArray(tournament.referees) ? tournament.referees : [];
        const referee = {
            id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
            name,
            role: (dto?.role || '').trim() || 'Referee',
            phone: (dto?.phone || '').trim(),
        };
        tournament.referees = [...referees, referee];
        await tournamentRepo.save(tournament);
        return referee;
    },

    async deleteReferee(tournamentId: string, refereeId: string): Promise<boolean> {
        const tournament = await tournamentRepo.findOneBy({ id: parseInt(tournamentId) });
        if (!tournament) return false;

        const referees = Array.isArray(tournament.referees) ? tournament.referees : [];
        const next = referees.filter((r: any) => String(r.id) !== String(refereeId));
        if (next.length === referees.length) return false;

        tournament.referees = next;
        await tournamentRepo.save(tournament);
        return true;
    }
};
