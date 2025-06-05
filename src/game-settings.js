import { ChoiceHelper } from "./helpers";

export default {
    id: 134,
    name: "MiniRoulette",
    durations: {
        wholeRound: 59,
        placingBets: 45,
        lockingBet: 5,
        shakeThePlateDuration: 3,
    },
    choices: {
        choicesGroupByNumber: ChoiceHelper.getBetChoicesGroupByNumbers(),
        choicesGroupByType: ChoiceHelper.getBetChoicesGroupByTypes(),
    },
    choicesMapper: {},
    defaultBetTracks: {},
    numberOfRoundHistory: 300,
    hedgeBetGroups: ["oddEven", "bigSmall", "redBlack"],
};
