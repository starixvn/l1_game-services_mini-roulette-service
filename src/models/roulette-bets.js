import mongoose from "mongoose";

const schema = new mongoose.Schema({
    uid: { type: String, required: true },
    name: { type: String, required: true },

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

    totalAmount: { type: Number, default: 0 },
    betwin: { type: Number, default: 0 },
    time: { type: Date },
    odds: { type: Object },

    siteId: { type: String },
    freeBet: { type: Boolean, default: false },

    currency: { type: String },
    rate: { type: Number, required: true },

    playerId: { type: String },
    operatorId: { type: String },
    roundId: { type: Number, required: true },
    paid: { type: Boolean, default: false },
});

const bets = mongoose.model("miniroulette_bets", schema);
const tmpBets = mongoose.model("miniroulette_tmpbets", schema);

export { bets as RouletteBets, tmpBets as RouletteTmpBets };
