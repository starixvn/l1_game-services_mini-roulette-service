import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    local: {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true, hide: true },
        ban_pass: { type: Number, default: 0 },
        ban_login: { type: Boolean, default: false },
        token: { type: String },
        lastDate: { type: String },
        lastLogin: { type: String },
        regDate: { type: Date },
        partnerId: { type: String },
        memberId: { type: Number },
        memberName: { type: String },
        currency: { type: String },

        operatorId: { type: String },
        playerId: { type: String },
        playerName: { type: String },
    },
});

export default mongoose.models.users || mongoose.model("users", Schema);
