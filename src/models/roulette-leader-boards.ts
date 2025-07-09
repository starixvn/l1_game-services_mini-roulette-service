import { Model, model, Schema } from "mongoose";

interface IRouletteLeaderboard extends Document {
    date: string;
    leaderboard: Array<{
        uid: string;
        playerName: string;
        avatarId: string;
        totalWin: number;
        totalAmount: number;
        rank: number;
    }>;
    updatedAt: Date;
    lastProcessedTime: Date | null;
}

const RouletteLeaderboardSchema = new Schema<IRouletteLeaderboard>({
    date: { type: String, required: true, unique: true },
    leaderboard: [
        {
            uid: String,
            playerName: String,
            avatarId: String,
            totalWin: Number,
            totalAmount: Number,
            rank: Number,
        },
    ],
    updatedAt: { type: Date, default: Date.now },
    lastProcessedTime: { type: Date, default: null },
});

const RouletteLeaderboardModel: Model<IRouletteLeaderboard> = model<IRouletteLeaderboard>(
    "miniroulette_leaderboards",
    RouletteLeaderboardSchema
);

export default RouletteLeaderboardModel;
