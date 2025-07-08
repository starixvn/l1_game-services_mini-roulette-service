export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "https://l2-proxy1.lumigame.com/game-api",
        authUrl: "https://l2-auth1.lumigame.com",
        client: {
            id: "game-server",
            secret: "gameserver@20luminet&",
        },
        useAuthenticate: true,
        requestTimeout: 10000,
        placeBetTimeout: 4000,
        enabledApiLogs: true,
    },
    authenticateSettings: {
        url: "https://l2-auth1.lumigame.com",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "https://l2-proxy1.lumigame.com/user",
    },
    socketOptions: {
        pingInterval: 60 * 1000,
        pingTimeout: 60 * 1000,
        transports: ["websocket"],
        allowUpgrades: false,
        perMessageDeflate: false,
    },
    enabledLogs: true,
    database: {
        url: "mongodb://lmn_backend:LmnBackend@10.10.50.12:39201,10.10.50.13:39201,10.10.50.14:39201/?replicaSet=L2pLocal&appName=MiniRoulette",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "https://50e405ebce7003a0e1edbda2bf28b14c@sentry-k8s.lumigame.com/3",
        logIdentifier: "mini-roulette",
        env: "DEV",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    disableCors: true,
    gameManagementApiSettings: {
        BASE: "https://l2-proxy1.lumigame.com/game-management-service",
    },
};
