import mongoose from "mongoose";

const settlementResultSchema = new mongoose.Schema(
    {
        straightUp: { type: [String], default: [] },
        dozen: { type: [String], default: [] },
        redBlack: { type: [String], default: [] },
        oddEven: { type: [String], default: [] },
    },
    { _id: false }
);

const Schema = new mongoose.Schema({
    id: { type: Number, required: true },
    result: { type: Number, required: true },
    settlementResult: settlementResultSchema,
    time: { type: Date, default: new Date() },
    exchangeRateId: { type: Number, required: true },
});

const modelName = "miniroulette_rounds";

export default mongoose.model(modelName, Schema);
