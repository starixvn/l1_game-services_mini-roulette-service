import mongoose from "mongoose";
import { BetSchema } from "sc-game-base/src/core/models";

const schema = new mongoose.Schema({
    straightUp: { type: Object },
    dozen: { type: Object },
    redBlack: { type: Object },
    oddEven: { type: Object },
    ...BetSchema.tempBetBaseSchema,
});

const modelName = "miniroulette_betlogs";
export default mongoose.model(modelName, schema);
