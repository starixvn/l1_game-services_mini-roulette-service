import Chance from "chance";
import randomLib1 from "random";
import { Random, MersenneTwister19937 } from "random-js";
import Constants from "../constants";
import { ChoiceHelper } from "../helpers";
import { randomInt } from "crypto";
import _ from "lodash";
import randomInteger from "random-int";

function random1(min, max) {
    return randomInt(min, max + 1);
}

function random2(min, max) {
    const chance = new Chance();
    return chance.natural({ min: min, max: max });
}

function random3(min, max) {
    const chance = new Chance();
    return chance.integer({ min: min, max: max });
}

function random4(min, max) {
    return randomLib1.int(min, max);
}

function random5(min, max) {
    const randomJs = new Random(MersenneTwister19937.autoSeed());
    return randomJs.integer(min, max);
}

function random6(min, max) {
    return _.random(min, max);
}

function random7(min, max) {
    return randomInteger(min, max);
}

function random8(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const randomModes = {
    1: [random1, random2, random3, random4],
    2: [random5, random6, random7, random8],
    3: [random1, random3, random5, random7],
};

export const generateResult = (randomMode) => {
    const randomFunctions = randomModes[randomMode] || randomModes[1];

    const chance = new Chance();
    const randomFunction = chance.pickone(randomFunctions);

    return randomFunction(Constants.numberWheel.min, Constants.numberWheel.max);
};

export const getSettlementResult = (roundResult) => {
    return ChoiceHelper.generateChoiceByNumber(roundResult);
};
