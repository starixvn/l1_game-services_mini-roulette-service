import mongoose from "mongoose";

interface IRouletteLeaderboard extends Document {
    date: string;
    leaderboard: Array<{
        uid: string;
        totalWin: number;
        rank: number;
    }>;
    updatedAt: Date;
    lastProcessedTime: Date | null;
}

const RouletteLeaderboardSchema = new mongoose.Schema<IRouletteLeaderboard>({
    date: { type: String, required: true, unique: true, index: true },
    leaderboard: [
        {
            uid: String,
            totalWin: Number,
            rank: Number,
        },
        { _id: false },
    ],
    updatedAt: { type: Date, default: Date.now },
    lastProcessedTime: { type: Date, default: null },
});

const RouletteLeaderboardModel: mongoose.Model<IRouletteLeaderboard> = mongoose.model<IRouletteLeaderboard>(
    "miniroulette_leaderboards",
    RouletteLeaderboardSchema
);

export default RouletteLeaderboardModel;
