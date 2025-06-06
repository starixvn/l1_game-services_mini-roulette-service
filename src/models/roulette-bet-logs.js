import mongoose from "mongoose";

const schema = new mongoose.Schema({
    uid: { type: String, required: true },
    time: { type: Date, required: true },

    straightUp: { type: Object },
    split: { type: Object },
    street: { type: Object },
    triangle: { type: Object },
    corner: { type: Object },
    fourNumbers: { type: Object },
    line: { type: Object },
    column: { type: Object },
    dozen: { type: Object },
    redBlack: { type: Object },
    oddEven: { type: Object },
    bigSmall: { type: Object },

    siteId: { type: String },

    currency: { type: String },
    rate: { type: Number, required: true },

    playerId: { type: String },
    operatorId: { type: String },
    roundId: { type: Number, required: true },
});

export default mongoose.model("miniroulette_betlogs", schema);
