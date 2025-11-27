import mongoose from "mongoose";
import { BetSchema } from "sc-game-base/src/core/models";

const schema = new mongoose.Schema({
    straightUp: { type: Object }, // { "1": 100, "2": 200, ... }
    dozen: { type: Object }, // { "1": 100, "2": 100, ... }
    redBlack: { type: Object }, // { "red": 100, "black": 100, ... }
    oddEven: { type: Object }, // { "odd": 100, "even": 100, ... }
    currencyGroupId: { type: String },
    guaranteedFeature: { type: Object },
    guaranteedWinStatus: { type: String, default: "", enum: ["", "normal", "weakened"] },
    guaranteedLossStatus: { type: String, default: "", enum: ["", "normal", "weakened"] },
    accumulatedAmount: { type: Number },
    settlementDetails: { type: Array },
    ...BetSchema.betBaseSchema,
});
const modelName = "miniroulette_bets";

const bets = mongoose.model(modelName, schema);

export { bets as RouletteBets };