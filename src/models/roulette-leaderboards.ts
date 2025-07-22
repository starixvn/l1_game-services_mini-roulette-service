import mongoose from "mongoose";

interface IRouletteLeaderboard extends Document {
    date: string;
    leaderboard: Array<{
        uid: string;
        totalWin: number;
        rank: number;
    }>;
    updatedAt: Date;
    currency: string;
    lastProcessedTime: Date | null;
    operatorId: string;
}

const RouletteLeaderboardSchema = new mongoose.Schema<IRouletteLeaderboard>({
    date: { type: String, required: true },
    leaderboard: [
        {
            uid: String,
            totalWin: Number,
            rank: Number,
        },
        { _id: false },
    ],
    currency: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    lastProcessedTime: { type: Date, default: null },
    operatorId: { type: String, required: true },
});

const modelName = "miniroulette_leaderboards";
export default mongoose.model<IRouletteLeaderboard>(modelName, RouletteLeaderboardSchema);
