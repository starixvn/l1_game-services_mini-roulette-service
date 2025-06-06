import mongoose from "mongoose";

const modelName = "miniroulette_rounds";

const settlementResultSchema = new mongoose.Schema(
    {
        straightUp: { type: [String], default: [] },
        split: { type: [String], default: [] },
        street: { type: [String], default: [] },
        triangle: { type: [String], default: [] },
        corner: { type: [String], default: [] },
        fourNumbers: { type: [String], default: [] },
        line: { type: [String], default: [] },
        column: { type: [String], default: [] },
        dozen: { type: [String], default: [] },
        redBlack: { type: [String], default: [] },
        oddEven: { type: [String], default: [] },
        bigSmall: { type: [String], default: [] },
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

export default mongoose.model(modelName, Schema);
