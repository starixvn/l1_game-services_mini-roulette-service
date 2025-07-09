import { ChoiceHelper } from "./helpers";
import Constants from "./constants";
export default {
    id: 134,
    name: "MiniRoulette",
    durations: {
        wholeRound: 60,
    },
    choices: {
        choicesGroupByNumber: ChoiceHelper.getBetChoicesGroupByNumbers(),
        choicesGroupByType: ChoiceHelper.getBetChoicesGroupByTypes(),
    },
    choicesMapper: Constants.choicesMapper,
    numberOfRoundHistory: 100,
};
