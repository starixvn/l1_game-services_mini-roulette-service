import { ChoiceHelper } from "./helpers";

export default {
    id: 134,
    name: "MiniRoulette",
    durations: {
        wholeRound: 60,
        botFrequency: 5,
    },
    choices: {
        choicesGroupByNumber: ChoiceHelper.getBetChoicesGroupByNumbers(),
        choicesGroupByType: ChoiceHelper.getBetChoicesGroupByTypes(),
    },
    choicesMapper: {},
    numberOfRoundHistory: 100,
    hedgeBetGroups: ["oddEven", "bigSmall", "redBlack"],
};
