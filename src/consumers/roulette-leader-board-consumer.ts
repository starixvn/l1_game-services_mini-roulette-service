import RouletteLeaderboardModel from "../models/roulette-leader-boards";
import { RouletteGameData } from "../roulette-game-data";

export default class RouletteLeaderBoardConsumer {
    gameData: RouletteGameData;

    constructor({ gameData }: { gameData: RouletteGameData }) {
        this.gameData = gameData;
    }

    async consume(player: any) {
        const leaderboard = await this.getLeaderboardByDay(new Date(), player.UID);
        return leaderboard;
    }

    async getLeaderboardByDay(date: Date, uid: string) {
        const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 30);
        const leaderboard = await RouletteLeaderboardModel.findOne({ date: key }, { _id: 0, __v: 0 });
        if (!leaderboard) {
            return [];
        }
        const playerRank = leaderboard.leaderboard.findIndex((entry) => entry.uid === uid);
        return { leaderboard, playerRank, time: date.toISOString() };
    }
}
