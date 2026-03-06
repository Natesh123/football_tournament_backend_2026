import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Match } from "./match.entity";
import { GroupTeam } from "../tournaments/group-team.entity";
import { MatchSource } from "./match-source.entity";

export const MatchController = {
    async updateResult(req: any, res: any) {
        try {
            const { id } = req.params;
            const { homeScore, awayScore } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const groupTeamRepo = AppDataSource.getRepository(GroupTeam);
            const matchSourceRepo = AppDataSource.getRepository(MatchSource);

            const match = await matchRepo.findOne({
                where: { id },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
            });

            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.status = "completed" as any;
            await matchRepo.save(match);

            // If group match, update standings
            if (match.group && match.homeTeam && match.awayTeam) {
                const homeStanding = await groupTeamRepo.findOne({ where: { group: { id: match.group.id }, team: { id: match.homeTeam.id } } });
                const awayStanding = await groupTeamRepo.findOne({ where: { group: { id: match.group.id }, team: { id: match.awayTeam.id } } });

                if (homeStanding && awayStanding) {
                    // Remove logic for reversing old scores omitted for simplicity in this initial MVP
                    homeStanding.played += 1;
                    awayStanding.played += 1;
                    homeStanding.goals_for += homeScore;
                    homeStanding.goals_against += awayScore;
                    homeStanding.goal_difference += (homeScore - awayScore);
                    awayStanding.goals_for += awayScore;
                    awayStanding.goals_against += homeScore;
                    awayStanding.goal_difference += (awayScore - homeScore);

                    if (homeScore > awayScore) {
                        homeStanding.wins += 1;
                        awayStanding.losses += 1;
                        homeStanding.points += 3;
                    } else if (awayScore > homeScore) {
                        awayStanding.wins += 1;
                        homeStanding.losses += 1;
                        awayStanding.points += 3;
                    } else {
                        homeStanding.draws += 1;
                        awayStanding.draws += 1;
                        homeStanding.points += 1;
                        awayStanding.points += 1;
                    }

                    await groupTeamRepo.save([homeStanding, awayStanding]);
                }
            }

            // If knockout match, propagate winner
            if (match.stage && match.stage.stage_type === "knockout") {
                const pendingSources = await matchSourceRepo.find({
                    where: { source_type: "match_winner", source_value: match.id },
                    relations: ["match"]
                });

                const winner = homeScore > awayScore ? match.homeTeam : match.awayTeam;
                if (winner) {
                    for (const source of pendingSources) {
                        const targetMatch = await matchRepo.findOne({ where: { id: source.match.id } });
                        if (targetMatch) {
                            if (source.side === "home") targetMatch.homeTeam = winner;
                            if (source.side === "away") targetMatch.awayTeam = winner;
                            await matchRepo.save(targetMatch);
                        }
                    }
                }
            }

            res.json({ success: true, data: match });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
