/**
 * seed_sample_data.ts
 * -------------------------------------------------------------------------
 * Wipes ALL tournament + team data and reseeds a rich set of SAMPLE records
 * that exercise every UI case for manual testing:
 *
 *   Teams            – every TeamType, with/without logo, email, captain,
 *                      address; full roster / staff-only / empty roster.
 *   Team members     – every role, every status, every preferred foot,
 *                      with/without jersey, position, dob, photo.
 *   Tournaments      – every status, public/private, free/paid, with/without
 *                      logo & cover, past/current/future dates.
 *   Registrations    – every approval status x payment status combination.
 *   Matches          – scheduled / live / completed states.
 *
 * User / role / permission / sponsor data is left untouched.
 *
 * Run with:  npx ts-node src/scripts/seed_sample_data.ts
 * -------------------------------------------------------------------------
 */
import { AppDataSource } from "../config/data-source";
import { Team, TeamType } from "../modules/teams/team.entity";
import {
    TeamMember,
    TeamMemberRole,
    TeamMemberStatus,
    PreferredFoot,
} from "../modules/teams/team-member.entity";
import { Tournament, TournamentStatus } from "../modules/tournaments/tournament.entity";
import {
    TournamentTeam,
    TeamStatus,
    TeamPaymentStatus,
} from "../modules/tournaments/tournament-team.entity";
import { Match, MatchStatus, MatchPeriod } from "../modules/matches/match.entity";

// Tables to clear (dependents first). Names resolved from entity metadata so
// they always match the live schema regardless of naming strategy.
const CLUSTER_ENTITIES = [
    "MatchEvent",
    "MatchSource",
    "Match",
    "Bracket",
    "GroupTeam",
    "Group",
    "FormatStage",
    "FormatGroupSettings",
    "FormatKnockoutSettings",
    "TournamentFormat",
    "TournamentTiebreaker",
    "TournamentRules",
    "TournamentVenue",
    "TournamentFinance",
    "TournamentPrizePool",
    "TournamentPresentation",
    "TournamentSponsor",
    "Organizer",
    "TournamentTeam",
    "Tournament",
    "TeamMember",
    "Team",
];

const days = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};

async function clearCluster() {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    console.log("🧹  Clearing existing tournament + team data...");
    await runner.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const entityName of CLUSTER_ENTITIES) {
        try {
            const table = AppDataSource.getMetadata(entityName).tableName;
            await runner.query(`TRUNCATE TABLE \`${table}\``);
            console.log(`   • truncated ${table}`);
        } catch (e: any) {
            console.warn(`   ! skipped ${entityName}: ${e.message}`);
        }
    }
    await runner.query("SET FOREIGN_KEY_CHECKS = 1");
    await runner.release();
}

// --------------------------------------------------------------------------
// Team member factories.
//
// A player may exist across teams in real life, but within the data that lands
// in a single tournament no person may appear on two teams. We guarantee this
// the simplest way: every seeded member gets a UNIQUE name drawn from a shared
// pool, so no two teams ever share a player.
//
// The roster *template* below carries the structure (roles, positions,
// statuses, feet, jersey, dob, photo) that exercises every UI case; only the
// name is filled in per team from the pool.
// --------------------------------------------------------------------------
type MemberTemplate = Omit<Partial<TeamMember>, "name">;

const ROSTER_TEMPLATE: MemberTemplate[] = [
    // Captain — with jersey + dob + photo
    { role: TeamMemberRole.CAPTAIN, position: "Goalkeeper", jerseyNumber: 1, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.RIGHT, dob: "1994-03-12", photoUrl: "https://i.pravatar.cc/150?img=12" },
    // Vice-captain
    { role: TeamMemberRole.VICE_CAPTAIN, position: "Centre-Back", jerseyNumber: 4, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.LEFT, dob: "1996-07-22" },
    // Players — varied feet / statuses / with & without jersey
    { role: TeamMemberRole.PLAYER, position: "Right-Back", jerseyNumber: 2, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.RIGHT },
    { role: TeamMemberRole.PLAYER, position: "Left-Back", jerseyNumber: 3, status: TeamMemberStatus.INJURED, preferredFoot: PreferredFoot.LEFT, dob: "1998-01-09" },
    { role: TeamMemberRole.PLAYER, position: "Defensive Midfield", jerseyNumber: 6, status: TeamMemberStatus.SUSPENDED, preferredFoot: PreferredFoot.BOTH },
    { role: TeamMemberRole.PLAYER, position: "Central Midfield", jerseyNumber: 8, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.RIGHT, photoUrl: "https://i.pravatar.cc/150?img=33" },
    { role: TeamMemberRole.PLAYER, position: "Attacking Midfield", jerseyNumber: 10, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.LEFT, dob: "1999-11-30" },
    { role: TeamMemberRole.PLAYER, position: "Right Wing", jerseyNumber: 7, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.RIGHT },
    { role: TeamMemberRole.PLAYER, position: "Left Wing", jerseyNumber: 11, status: TeamMemberStatus.INJURED, preferredFoot: PreferredFoot.LEFT },
    { role: TeamMemberRole.PLAYER, position: "Striker", jerseyNumber: 9, status: TeamMemberStatus.ACTIVE, preferredFoot: PreferredFoot.BOTH, dob: "1997-05-18", photoUrl: "https://i.pravatar.cc/150?img=51" },
    // Player with NO jersey / position (edge case)
    { role: TeamMemberRole.PLAYER, status: TeamMemberStatus.ACTIVE },
    // Staff
    { role: TeamMemberRole.COACH, status: TeamMemberStatus.ACTIVE, photoUrl: "https://i.pravatar.cc/150?img=60" },
    { role: TeamMemberRole.MANAGER, status: TeamMemberStatus.ACTIVE },
];

const STAFF_TEMPLATE: MemberTemplate[] = [
    { role: TeamMemberRole.COACH, status: TeamMemberStatus.ACTIVE },
    { role: TeamMemberRole.MANAGER, status: TeamMemberStatus.ACTIVE },
];

// A large pool of distinct names. A cursor hands each one out exactly once so
// no player is ever shared between teams.
const FIRST_NAMES = [
    "Marcus", "Daniel", "Liam", "Sofiane", "Hiroshi", "Ethan", "Pedro", "Noah", "Tomas", "Andre",
    "Oliver", "Lucas", "Mateo", "Kai", "Diego", "Sam", "Leon", "Felix", "Omar", "Yusuf",
    "Ivan", "Karim", "Nathan", "Hugo", "Adam", "Ali", "Bruno", "Carlos", "David", "Emre",
    "Finn", "Gabriel", "Henrik", "Idris", "Jonas", "Kofi", "Luka", "Milan", "Niko", "Oscar",
    "Paulo", "Quinn", "Rafael", "Sergio", "Theo", "Umar", "Viktor", "Wesley", "Xavier", "Yannick",
    "Zane", "Aaron", "Bilal", "Caleb", "Dmitri", "Elias", "Franco", "Gustav", "Hassan", "Ismael",
    "Jamal", "Kenji", "Lorenzo", "Mehdi", "Nils", "Otto", "Pablo", "Rashid", "Stefan", "Tariq",
];
const LAST_NAMES = [
    "Reid", "Okafor", "Carter", "Benali", "Tanaka", "Wright", "Alves", "Kim", "Novak", "Costa",
    "Hughes", "Silva", "Moreno", "Larsson", "Ferreira", "Cole", "Bauer", "Vidal", "Haddad", "Demir",
    "Petrov", "Khan", "Brooks", "Lefevre", "Walsh", "Saleh", "Rossi", "Mendez", "Park", "Yilmaz",
    "Berg", "Santos", "Olsen", "Said", "Lind", "Mensah", "Horvat", "Jovic", "Sato", "Lindqvist",
    "Pereira", "Hayes", "Romero", "Garcia", "Schmidt", "Aziz", "Petersen", "Cruz", "Tan", "Diallo",
];

let nameCursor = 0;
function nextName(): string {
    const first = FIRST_NAMES[nameCursor % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(nameCursor / FIRST_NAMES.length) % LAST_NAMES.length];
    nameCursor++;
    return `${first} ${last}`;
}

function buildRoster(): Partial<TeamMember>[] {
    return ROSTER_TEMPLATE.map((t) => ({ ...t, name: nextName() }));
}

function buildStaffOnly(): Partial<TeamMember>[] {
    return STAFF_TEMPLATE.map((t) => ({ ...t, name: nextName() }));
}

async function seed() {
    console.log("🔌  Connecting to database...");
    await AppDataSource.initialize();

    await clearCluster();

    const teamRepo = AppDataSource.getRepository(Team);
    const memberRepo = AppDataSource.getRepository(TeamMember);
    const tournamentRepo = AppDataSource.getRepository(Tournament);
    const regRepo = AppDataSource.getRepository(TournamentTeam);
    const matchRepo = AppDataSource.getRepository(Match);

    // ----------------------------------------------------------------------
    // TEAMS — one per type + edge cases
    // ----------------------------------------------------------------------
    console.log("\n🏳️  Seeding teams...");
    // _syncCaptain: copy the team's captainName label from its actual captain
    // member (so the displayed captain matches a real player on the roster).
    const teamDefs: Array<Partial<Team> & { _roster?: "full" | "staff" | "none"; _syncCaptain?: boolean }> = [
        // Club — full profile, external logo, full roster
        { name: "Neon Strikers FC", shortName: "NSF", teamType: TeamType.CLUB, city: "Metropolis", state: "California", country: "USA", foundedYear: 2008, homeGround: "Voltage Arena", contactEmail: "contact@neonstrikers.com", description: "Reigning city champions known for relentless pressing football.", logoUrl: "https://ui-avatars.com/api/?name=NS&background=facc15&color=000", _roster: "full", _syncCaptain: true },
        // School — minimal, no logo, no email, staff only
        { name: "Riverside High School", shortName: "RHS", teamType: TeamType.SCHOOL, city: "Riverside", country: "USA", _roster: "staff" },
        // College — no logo, captain name set but EMPTY roster (edge case)
        { name: "St. Augustine College", shortName: "SAC", teamType: TeamType.COLLEGE, city: "Boston", state: "Massachusetts", country: "USA", foundedYear: 1965, contactEmail: "athletics@staugustine.edu", captainName: "Greg Holloway", _roster: "none" },
        // Corporate — has logo, NO captain (edge case), full roster
        { name: "Quantum Corp United", shortName: "QCU", teamType: TeamType.CORPORATE, city: "Austin", state: "Texas", country: "USA", foundedYear: 2015, homeGround: "Quantum Park", contactEmail: "sports@quantumcorp.io", description: "The official football side of Quantum Corp employees.", logoUrl: "https://ui-avatars.com/api/?name=QC&background=22c55e&color=000", _roster: "full" },
        // Academy — youth, full roster, founded recently
        { name: "Golden Eagles Academy", shortName: "GEA", teamType: TeamType.ACADEMY, city: "Phoenix", state: "Arizona", country: "USA", foundedYear: 2019, homeGround: "Eagle Nest Ground", contactEmail: "youth@goldeneagles.org", description: "Developing the next generation of talent.", _roster: "full", _syncCaptain: true },
        // No teamType at all (edge case — badge hidden)
        { name: "Independent Wanderers", shortName: "IND", city: "Portland", country: "USA", contactEmail: "hello@wanderers.fc", _roster: "staff" },
        // Very long name to test truncation in the card
        { name: "Borough of Greater Springfield Metropolitan Athletic Football Club", shortName: "BGS", teamType: TeamType.CLUB, city: "Springfield", state: "Illinois", country: "USA", foundedYear: 1923, contactEmail: "info@bgsmafc.example.com", _roster: "full", _syncCaptain: true },
        // Logo via external URL but no other optional fields
        { name: "Crimson Wolves", shortName: "CRW", teamType: TeamType.CLUB, logoUrl: "https://ui-avatars.com/api/?name=CW&background=ef4444&color=fff", _roster: "full", _syncCaptain: true },
    ];

    const savedTeams: Team[] = [];
    for (const def of teamDefs) {
        const { _roster, _syncCaptain, ...teamData } = def;
        const team = await teamRepo.save(teamRepo.create(teamData));
        savedTeams.push(team);

        let roster: Partial<TeamMember>[] = [];
        if (_roster === "full") roster = buildRoster();
        else if (_roster === "staff") roster = buildStaffOnly();

        for (const m of roster) {
            await memberRepo.save(memberRepo.create({ ...m, team }));
        }

        // Keep the team's captain label consistent with its real captain member
        if (_syncCaptain) {
            const captain = roster.find((m) => m.role === TeamMemberRole.CAPTAIN);
            if (captain?.name) {
                team.captainName = captain.name;
                await teamRepo.save(team);
            }
        }
        console.log(`   • ${team.name}  (${roster.length} members)`);
    }

    // ----------------------------------------------------------------------
    // TOURNAMENTS — one per status + varied config
    // ----------------------------------------------------------------------
    console.log("\n🏆  Seeding tournaments...");
    const tournamentDefs: Partial<Tournament>[] = [
        // DRAFT — future, private, free, approval not required, no media
        { name: "Winter Friendly Cup 2027", shortName: "WFC", description: "A draft tournament not yet announced publicly.", status: TournamentStatus.DRAFT, type: "7aside", visibility: "PRIVATE", maxTeams: 8, minTeams: 4, squadSize: 12, playerLimit: 7, regFee: 0, approvalRequired: false, startDate: days(120), endDate: days(135) },
        // REGISTRATION_OPEN — paid, approval required, public, with logo + cover, reg window open
        { name: "Spring Open Championship 2026", shortName: "SOC", description: "Open registration now — secure your spot!", status: TournamentStatus.REGISTRATION_OPEN, type: "11aside", visibility: "PUBLIC", maxTeams: 16, minTeams: 6, squadSize: 23, playerLimit: 11, regFee: 250.00, approvalRequired: true, regOpenDate: days(-10), regCloseDate: days(20), startDate: days(40), endDate: days(70), logo: "https://ui-avatars.com/api/?name=SOC&background=3b82f6&color=fff", coverImage: "https://picsum.photos/seed/soc/1200/400" },
        // IN_PROGRESS — public, paid, currently running (this one gets teams + matches)
        { name: "Metropolis Premier League 2026", shortName: "MPL", description: "The flagship city league currently underway.", status: TournamentStatus.IN_PROGRESS, type: "11aside", visibility: "PUBLIC", maxTeams: 12, minTeams: 8, squadSize: 23, playerLimit: 11, regFee: 500.00, approvalRequired: true, regOpenDate: days(-60), regCloseDate: days(-30), startDate: days(-14), endDate: days(45), logo: "https://ui-avatars.com/api/?name=MPL&background=facc15&color=000" },
        // COMPLETED — past, public, free
        { name: "Summer Pro Invitational 2025", shortName: "SPI", description: "A completed pre-season invitational.", status: TournamentStatus.COMPLETED, type: "11aside", visibility: "PUBLIC", maxTeams: 8, minTeams: 4, squadSize: 18, playerLimit: 11, regFee: 0, approvalRequired: false, regOpenDate: days(-200), regCloseDate: days(-170), startDate: days(-150), endDate: days(-120), logo: "https://ui-avatars.com/api/?name=SPI&background=8b5cf6&color=fff" },
        // REGISTRATION_OPEN — minimal config edge case (no optional fields)
        { name: "Community Kickabout", status: TournamentStatus.REGISTRATION_OPEN, maxTeams: 16, startDate: days(30), endDate: days(31) },
    ];

    const savedTournaments: Tournament[] = [];
    for (const def of tournamentDefs) {
        const t = await tournamentRepo.save(tournamentRepo.create(def));
        savedTournaments.push(t);
        console.log(`   • ${t.name}  [${t.status}]`);
    }

    // ----------------------------------------------------------------------
    // REGISTRATIONS — every status x payment combination on the live league
    // ----------------------------------------------------------------------
    console.log("\n📝  Seeding tournament registrations...");
    const inProgress = savedTournaments.find(t => t.shortName === "MPL")!;
    const regOpen = savedTournaments.find(t => t.shortName === "SOC")!;

    const regCombos: Array<{ status: TeamStatus; payment: TeamPaymentStatus }> = [
        { status: TeamStatus.APPROVED, payment: TeamPaymentStatus.PAID },
        { status: TeamStatus.APPROVED, payment: TeamPaymentStatus.PENDING },
        { status: TeamStatus.PENDING, payment: TeamPaymentStatus.PAID },
        { status: TeamStatus.PENDING, payment: TeamPaymentStatus.PENDING },
        { status: TeamStatus.REJECTED, payment: TeamPaymentStatus.PENDING },
    ];

    // Register the first 5 teams into the live league with each combo
    for (let i = 0; i < regCombos.length && i < savedTeams.length; i++) {
        await regRepo.save(regRepo.create({
            tournament: inProgress,
            team: savedTeams[i],
            status: regCombos[i].status,
            paymentStatus: regCombos[i].payment,
        }));
    }
    console.log(`   • ${regCombos.length} registrations on ${inProgress.name}`);

    // A couple of pending registrations on the open tournament too
    for (let i = 0; i < 3 && i < savedTeams.length; i++) {
        await regRepo.save(regRepo.create({
            tournament: regOpen,
            team: savedTeams[savedTeams.length - 1 - i],
            status: TeamStatus.PENDING,
            paymentStatus: i % 2 === 0 ? TeamPaymentStatus.PAID : TeamPaymentStatus.PENDING,
        }));
    }
    console.log(`   • 3 pending registrations on ${regOpen.name}`);

    // ----------------------------------------------------------------------
    // MATCHES — scheduled / live / completed on the live league
    // ----------------------------------------------------------------------
    console.log("\n⚽  Seeding matches...");
    const [t0, t1, t2, t3] = savedTeams;
    const matchDefs: Partial<Match>[] = [
        // Completed
        { tournament: inProgress, homeTeam: t0, awayTeam: t1, homeScore: 2, awayScore: 1, status: MatchStatus.COMPLETED, match_period: MatchPeriod.SECOND_HALF, startTime: days(-10), venue: "Voltage Arena", round: 1 },
        // Live
        { tournament: inProgress, homeTeam: t2, awayTeam: t3, homeScore: 1, awayScore: 1, status: MatchStatus.LIVE, match_period: MatchPeriod.SECOND_HALF, live_minute: 67, startTime: new Date(), venue: "Quantum Park", round: 2 },
        // Scheduled (future, 0-0)
        { tournament: inProgress, homeTeam: t0, awayTeam: t3, homeScore: 0, awayScore: 0, status: MatchStatus.SCHEDULED, match_period: MatchPeriod.NOT_STARTED, startTime: days(3), venue: "Eagle Nest Ground", round: 3 },
        { tournament: inProgress, homeTeam: t1, awayTeam: t2, homeScore: 0, awayScore: 0, status: MatchStatus.SCHEDULED, match_period: MatchPeriod.NOT_STARTED, startTime: days(5), venue: "Voltage Arena", round: 3 },
    ];
    for (const def of matchDefs) {
        await matchRepo.save(matchRepo.create(def));
    }
    console.log(`   • ${matchDefs.length} matches on ${inProgress.name}`);

    console.log("\n✅  Sample data seeded successfully!");
    console.log(`   Teams: ${savedTeams.length} | Tournaments: ${savedTournaments.length}`);
    await AppDataSource.destroy();
    process.exit(0);
}

seed().catch(async (err) => {
    console.error("\n❌  Seeding failed:", err);
    try { await AppDataSource.destroy(); } catch { /* ignore */ }
    process.exit(1);
});
