import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "./tournament.entity";
import { TournamentTeam, TeamStatus, TeamPaymentStatus } from "./tournament-team.entity";
import { Team } from "../teams/team.entity";
import { saveBase64Image } from "../../utils/image-upload.utils";
import { tournamentRulesService } from "./tournament-rules.service";
import { ExtraTimeRule, GoalkeeperRule, TournamentRules } from "./tournament-rules.entity";
import { VenueService } from "./venues/venue.service";
import { FinanceService } from "./finance/finance.service";
import { PresentationService } from "./presentation/presentation.service";
import { ResultsService } from "./results/results.service";
import { FieldType } from "./venues/venue.entity";
import { AcceptedPaymentMethod } from "./finance/finance.entity";

const venueService = new VenueService();
const financeService = new FinanceService();
const presentationService = new PresentationService();
const resultsService = new ResultsService();

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
        liveBroadcastEnabled: Boolean(presentation.showLiveScores)
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
        showCommentary: false,
        liveStreamLink: ""
    };
}


const tournamentRepo = AppDataSource.getRepository(Tournament);
const tournamentTeamRepo = AppDataSource.getRepository(TournamentTeam);
const teamRepo = AppDataSource.getRepository(Team);

export const TournamentService = {
    async findAll(): Promise<any[]> {
        const tournaments = await tournamentRepo.find({
            order: { createdAt: "DESC" },
            relations: ["organizer", "format", "rules"]
        });
        
        return Promise.all(tournaments.map(async t => {
            const result: any = { ...t };
            result.settings = {};
            if (t.rules) {
                result.settings.rules = mapDtoToRules(t.rules);
                delete result.rules;
            }

            result.settings.results = { autoPublish: Boolean(t.autoPublishResults) };

            const venueDto = await venueService.getVenue(t.id);
            if (venueDto) result.settings.venues = mapDtoToVenues(venueDto);

            const { finance, prizePool } = await financeService.getFinance(t.id);
            if (finance) result.settings.finance = mapDtoToFinance(finance, prizePool);

            const presentationDto = await presentationService.getPresentation(t.id);
            if (presentationDto) result.settings.presentation = mapDtoToPresentation(presentationDto);

            return result;
        }));
    },

    async findById(id: string): Promise<any | null> {
        const t = await tournamentRepo.findOne({
            where: { id: parseInt(id) },
            relations: ["organizer", "format", "rules"]
        });
        if (!t) return null;
        
        const result: any = { ...t };
        result.settings = {};
        if (t.rules) {
            result.settings.rules = mapDtoToRules(t.rules);
            delete result.rules;
        }

        result.settings.results = { autoPublish: Boolean(t.autoPublishResults) };

        const venueDto = await venueService.getVenue(t.id);
        if (venueDto) result.settings.venues = mapDtoToVenues(venueDto);

        const { finance, prizePool } = await financeService.getFinance(t.id);
        if (finance) result.settings.finance = mapDtoToFinance(finance, prizePool);

        const presentationDto = await presentationService.getPresentation(t.id);
        if (presentationDto) result.settings.presentation = mapDtoToPresentation(presentationDto);

        return result;
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
            if (settings.results?.autoPublish !== undefined) {
                await resultsService.toggleAutoPublish(saved.id, Boolean(settings.results.autoPublish));
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
            tournament.format = { ...tournament.format, ...data.format } as any;
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
            if (settings.results?.autoPublish !== undefined) {
                await resultsService.toggleAutoPublish(saved.id, Boolean(settings.results.autoPublish));
            }
        }

        return saved;
    },

    async remove(id: string): Promise<boolean> {
        const result = await tournamentRepo.delete(id);
        return (result.affected ?? 0) > 0;
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
        const tournament = await tournamentRepo.findOneBy({ id: parseInt(tournamentId) });
        const team = await teamRepo.findOneBy({ id: parseInt(teamId) });

        if (!tournament || !team) return null;

        // Check if already registered
        const existing = await tournamentTeamRepo.findOne({
            where: { tournament: { id: parseInt(tournamentId) }, team: { id: parseInt(teamId) } }
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
    }
};
