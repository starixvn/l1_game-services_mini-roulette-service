import mongoose from "mongoose";

interface ILangliveUserSettings extends Document {
    uid: string;
    avatarId: string;
    playerName: string;
    leaderboard: {
        hideAvatar: number;
        hideName: number;
    };
    updatedAt: Date;
    gameId: number;
}

const LangliveUserSettingsSchema = new mongoose.Schema<ILangliveUserSettings>({
    uid: { type: String, required: true },
    avatarId: { type: String, required: true },
    playerName: { type: String, required: true },
    leaderboard: { type: Object, required: true },
    gameId: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
});

LangliveUserSettingsSchema.index({ uid: 1, gameId: 1 }, { unique: true });

export default mongoose.model<ILangliveUserSettings>("langlive_user_settings", LangliveUserSettingsSchema);
