import Chance from "chance";
import randomLib1 from "random";
import { Random, MersenneTwister19937 } from "random-js";
import Constants from "../constants";
import { ChoiceHelper } from ".";
import { randomInt } from "crypto";
import _ from "lodash";
import randomInteger from "random-int";

function random1(min: number, max: number) {
    return randomInt(min, max + 1);
}

function random2(min: number, max: number) {
    const chance = new Chance();
    return chance.natural({ min: min, max: max });
}

function random3(min: number, max: number) {
    const chance = new Chance();
    return chance.integer({ min: min, max: max });
}

function random4(min: number, max: number) {
    return randomLib1.int(min, max);
}

function random5(min: number, max: number) {
    const randomJs = new Random(MersenneTwister19937.autoSeed());
    return randomJs.integer(min, max);
}

function random6(min: number, max: number) {
    return _.random(min, max);
}

function random7(min: number, max: number) {
    return randomInteger(min, max);
}

function random8(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const randomModes: Record<number, ((min: number, max: number) => number)[]> = {
    1: [random1, random2, random3, random4],
    2: [random5, random6, random7, random8],
    3: [random1, random3, random5, random7],
};

export const generateResult = (randomMode: number) => {
    const randomFunctions = randomModes[randomMode] || randomModes[1];

    const chance = new Chance();
    const randomFunction = chance.pickone(randomFunctions);

    return randomFunction(Constants.numberWheel.min, Constants.numberWheel.max);
};

export const getSettlementResult = (roundResult: number) => {
    return ChoiceHelper.generateChoiceByNumber(roundResult);
};
