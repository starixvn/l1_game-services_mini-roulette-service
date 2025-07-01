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

const round = {
    id: { type: Number, required: true },
    result: { type: Number, required: true },
    settlementResult: settlementResultSchema,
    time: { type: Date, default: new Date() },
    exchangeRateId: { type: Number, required: true },
};

const schema = new mongoose.Schema(round);

const playerRoundSchema = new mongoose.Schema({
    ...round,
    uid: { type: String, required: true },
    name: { type: String, required: true },
    playerId: { type: String },
    operatorId: { type: String, required: false },
});

const roundModelName = "miniroulette_rounds";
const playerRoundModelName = "miniroulette_player_rounds";
export const RouletteRounds = mongoose.model(roundModelName, schema);
export const RoulettePlayerRoundModel = mongoose.model(playerRoundModelName, playerRoundSchema);
