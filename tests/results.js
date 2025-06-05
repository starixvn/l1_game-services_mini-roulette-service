import { getSettlementResult, generateResult } from "../src/helpers/result-helper";

const streakNumber = 4;
const longestStreak = 4;
const totalNumber = 37;

const statisticsChoices = {
    redBlack: ["red", "black"],
    oddEven: ["odd", "even"],
    bigSmall: ["big", "small"],
    column: [1, 2],
    dozen: [1, 2, 3],
    no: new Array(totalNumber).fill(0).map((_, i) => i),
};

function initStreak() {
    const streaks = { total: 0 };

    const groups = Object.keys(statisticsChoices);
    groups.forEach((key) => {
        statisticsChoices[key].forEach((choice) => {
            streaks[`${key}_${choice}`] = 0;
        });
    });

    return streaks;
}

function calculateStreaks(occurrences, group, choices, streaks) {
    statisticsChoices[group].forEach((c) => {
        let count = choices.includes(c) ? occurrences[`${group}_${c}`] + 1 : 0;

        if (count >= streakNumber) {
            streaks.total++;
            streaks[`${group}_${c}`]++;
        }

        if (count >= longestStreak) {
            count = 1;
        }

        occurrences[`${group}_${c}`] = count;
    });
}

function run(randomMode) {
    const totalRounds = 100_000;

    const stats = {};
    for (let index = 0; index < totalNumber; index++) {
        stats[`no_${index}`] = 0;
    }

    const occurrences = initStreak();
    const streaks = initStreak();

    for (let index = 0; index < totalRounds; index++) {
        const result = generateResult(randomMode);
        const settlement = getSettlementResult(result);

        calculateStreaks(occurrences, "no", [result], streaks);
        stats[`no_${result}`]++;

        Object.keys(settlement).reduce((_, choiceGroup) => {
            if (!statisticsChoices[choiceGroup]) {
                return;
            }

            const choices = settlement[choiceGroup];
            for (let c of choices) {
                const k = `${choiceGroup}_${c}`;
                stats[k] = stats[k] ?? { count: 0, ratio: 0 };
                stats[k].count += 1;
                stats[k].ratio = stats[k].count / totalRounds;
            }

            calculateStreaks(occurrences, choiceGroup, choices, streaks);
        }, {});
    }

    stats.streaks = streaks;

    console.log(`======== Run ${totalRounds} rounds for mode ${randomMode} ========`);
    console.log(stats);
}

const randomModes = [3];
const runNo = 3;

for (let randomMode of randomModes) {
    for (let i = 0; i < runNo; i++) {
        run(randomMode);
    }
}
