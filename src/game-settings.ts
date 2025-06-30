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
    numberOfRoundHistory: 100,
    hedgeBetGroups: [],
    botSettings: {
        ratio: { mainOptions: 90, dozenOptions: 8, straightUpOptions: 2 },
        mainOptions: ["oddEven", "redBlack"],
        dozenOptions: ["dozen"],
        straightUpOptions: ["straightUp"],
    },
};
