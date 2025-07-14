import mongoose from "mongoose";
import { BetSchema } from "sc-game-base/src/core/models";

const schema = new mongoose.Schema({
    straightUp: { type: Object },
    dozen: { type: Object },
    redBlack: { type: Object },
    oddEven: { type: Object },
    ...BetSchema.betBaseSchema,
    currencyGroupId: { type: String },
    guaranteedFeature: { type: Object },
    guaranteedWinStatus: { type: String, default: "", enum: ["", "normal", "weakened"] },
    guaranteedLossStatus: { type: String, default: "", enum: ["", "normal", "weakened"] },
    accumulatedAmount: { type: Number },
    settlementDetails: { type: Array },
});

const modelName = "miniroulette_bets";
const bets = mongoose.model(modelName, schema);

export { bets as RouletteBets };
