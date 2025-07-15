import mongoose from "mongoose";

interface ILangliveUserSettings extends Document {
    uid: string;
    avatarUrl: string;
    nickname: string;
    leaderboard: {
        hideAvatar: boolean;
        hideName: boolean;
    };
    updatedAt: Date;
    gameId: number;
}

const LangliveUserSettingsSchema = new mongoose.Schema<ILangliveUserSettings>({
    uid: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    nickname: { type: String, required: true },
    leaderboard: { type: Object, required: true, _id: false, default: { hideAvatar: false, hideName: false } },
    gameId: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
});

LangliveUserSettingsSchema.index({ uid: 1, gameId: 1 }, { unique: true });

export default mongoose.model<ILangliveUserSettings>("langlive_user_settings", LangliveUserSettingsSchema);
