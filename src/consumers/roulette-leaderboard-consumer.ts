import { RouletteLeaderboardModel } from "../models";
import { RouletteGameData } from "../roulette-game-data";

export default class RouletteLeaderboardConsumer {
    gameData: RouletteGameData;

    constructor({ gameData }: { gameData: RouletteGameData }) {
        this.gameData = gameData;
    }

    async consume(player: any, payload: { top: number }) {
        const leaderboard = await this.getLeaderboardByDay(new Date(), player.UID, payload.top);
        return leaderboard;
    }

    async getLeaderboardByDay(date: Date, uid: string, top: number) {
        const key = date.toISOString().split("T")[0];
        const leaderboard = await RouletteLeaderboardModel.findOne({ date: key }, { _id: 0, __v: 0 });
        if (!leaderboard) {
            return { leaderboard: [], playerRank: -1, time: date.toISOString() };
        }
        const player = leaderboard.leaderboard.find((x) => x.uid === uid);
        const slicedLeaderboard = leaderboard.leaderboard.slice(0, top);
        return {
            leaderboard: slicedLeaderboard,
            playerRank: player?.rank,
            time: leaderboard.updatedAt.toISOString(),
            uid,
        };
    }
}
