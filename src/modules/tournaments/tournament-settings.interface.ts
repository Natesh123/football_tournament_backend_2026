export interface TournamentSettings {
    /**
     * General Identity
     * Defines the core branding, visibility, and high-level details of the tournament.
     */
    general: {
        name: string;
        shortName: string;
        description: string;
        status: string;
        visibility: string;
        type: string;
        logo?: string;
        coverImage?: string;
        organizer: {
            name: string;
            email: string;
            phone: string;
            website: string;
        };
        sponsor: {
            name: string;
            website: string;
        };
    };

    /**
     * Participants
     * Manages teams, players, registration dates, and entry requirements.
     */
    participants: {
        type: string;
        minTeams: number;
        maxTeams: number;
        regOpenDate: string;
        regCloseDate: string;
        approvalRequired: boolean;
        regFee: number;
        playerLimit: number;
        squadSize: number;
    };

    /**
     * Competition Format
     * Defines the structural progression, points, and tie-breaker systems.
     */
    format: {
        type: string;
        numGroups: number;
        teamsPerGroup: number;
        homeAway: boolean;
        winPoints: number;
        drawPoints: number;
        lossPoints: number;
        tieBreaker: string;
        qualRules: string;
    };

    /**
     * Schedule & Timing
     * Configures tournament duration, match windows, and auto-scheduling constraints.
     */
    schedule: {
        startDate: string;
        endDate: string;
        matchDuration: number;
        halfDuration: number;
        breakTime: number;
        matchDays: Record<string, boolean>;
        timeSlots: string;
    };

    /**
     * Match Rules
     * Defines exactly how the game is played on the pitch (e.g. substitutions, discipline).
     */
    rules: {
        govBody: string;
        playersOnField: number;
        minPlayers: number;
        subsAllowed: number;
        offsideRule: boolean;
        ballSize: number;
        pitchType: string;
        extraTimeRule: string;
        penaltiesRule: boolean;
        yellowSuspensionLimit: number;
        redSuspensionLength: number;
        gkRules: string;
    };

    /**
     * Venues & Facilities
     * Manages locations where matches will be played.
     */
    venues: {
        multipleVenues: boolean;
        primaryVenue: string;
        venueAddress: string;
        pitchCount: number;
        fieldType: string;
    };

    /**
     * Finance & Rewards
     * Manages incoming fees, accepted payment methods, and outgoing prize pools.
     */
    finance: {
        paymentMethod: string;
        prizePool: number;
        prizeMoney: number;
        paymentInfo: string;
        prizeDist: string;
        refundPolicy: string;
        regFee: number;
    };

    /**
     * Public Presentation
     * Customizes the look and feel of the tournament's public portal interface.
     */
    presentation: {
        themeColor: string;
        urlSlug: string;
        showStandings: boolean;
        showPlayerStats: boolean;
        showTopScorers: boolean;
        welcomeMsg: string;
        showLiveScores: boolean;
        showCommentary: boolean;
        liveStreamLink: string;
    };

    /**
     * Results & Analytics
     * Configures how results are published and managed over time.
     */
    results: {
        autoPublish: boolean;
    };
}
