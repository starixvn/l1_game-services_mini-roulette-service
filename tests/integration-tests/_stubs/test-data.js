import gameSetting from "./game-settings";

const game = {
    id: gameSetting.id,
    name: gameSetting.name,
};

const currencyData = { code: "USD", name: "$US" };

const socketOptionsFunc = (port) => {
    return {
        socketUri: `http://localhost:${port}/user/${gameSetting.name.toLowerCase()}`,
        gameName: game.name,
        proxyRoute: "/socket.io",
    };
};

const gameConfig = {
    type: 0,
    name: gameSetting.name.toLowerCase(),
    minBet: 1,
    maxBet: 3000,
    maxBetPerChoices: { straightUp: 3000, dozen: 3000, redBlack: 3000, oddEven: 3000 },
    odds: {
        straightUp: 36,
        dozen: 3,
        redBlack: 2,
        oddEven: 2,
    },
    botenabled: false,
    hour_maxbot: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bot_maxbet: 1000,
    choices_maxbet: { home: 3000, away: 3000, draw: 3000 },
};

const userBetData = (uid) => {
    return [
        {
            uid: uid,
            drawId: 2,
            freeBet: false,
            roundId: 1,
            betwin: 195.6,
            clientSeed: "0",
            currency: "INH",
            name: "Draco",
            odds: gameConfig.odds,
            operatorId: "ONEworksVGCash",
            playerId: 70000,
            rate: 1000,
            siteId: "4100300",
            paid: true,
            over: 120,
            odd: 140,
            totalAmount: 260,
        },
        {
            uid: uid,
            drawId: 8,
            freeBet: false,
            roundId: 1,
            betwin: 0,
            clientSeed: "0",
            currency: "INH",
            name: "Draco",
            odds: { over: 2, under: 2, odd: 2, even: 2 },
            operatorId: "ONEworksVGCash",
            playerId: 70000,
            rate: 1000,
            siteId: "4100300",
            paid: false,
            over: 120,
            odd: 140,
            totalAmount: 260,
        },
        {
            uid: uid,
            drawId: 8,
            freeBet: false,
            roundId: 1,
            betwin: 0,
            clientSeed: "0",
            currency: "INH",
            name: "Draco",
            odds: { over: 2, under: 2, odd: 2, even: 2 },
            operatorId: "ONEworksVGCash",
            playerId: 70000,
            rate: 1000,
            siteId: "4100300",
            paid: false,
            under: 120,
            even: 140,
            totalAmount: 260,
        },
    ];
};

const userBetLogData = (uid) => {
    return [
        {
            amount: 196.8,
            rebet: false,
            roundId: 1,
            drawId: 8,
            uid: uid,
            name: "Tornado45411",
            time: "2024-03-06T02:08:29.598Z",
            choice: "over",
            siteId: "4100300",
            currency: "INH",
            rate: 1000,
            operatorId: "ONEworksVGCash",
            playerId: 666,
        },
        {
            amount: 20,
            rebet: false,
            roundId: 1,
            drawId: 2,
            uid: uid,
            name: "Bird4252",
            time: "2024-03-06T02:10:48.915Z",
            choice: "under",
            siteId: "4100300",
            currency: "INH",
            rate: 1000,
            operatorId: "ONEworksVGCash",
            playerId: 2609,
        },
    ];
};

const rounds = (uid) => [
    {
        id: 1,
        uid: uid,
        result: 1,
        settlementResult: {
            straightUp: ["1"],
            dozen: ["1"],
            redBlack: ["red"],
            oddEven: ["odd"],
        },
        time: new Date(),
        exchangeRateId: 1,
    },
    {
        id: 2,
        uid: uid,
        result: 2,
        settlementResult: {
            straightUp: ["2"],
            dozen: ["1"],
            redBlack: ["black"],
            oddEven: ["even"],
        },
        time: new Date(),
        exchangeRateId: 1,
    },
];

export { currencyData, game, gameConfig, rounds, socketOptionsFunc, userBetData, userBetLogData };
