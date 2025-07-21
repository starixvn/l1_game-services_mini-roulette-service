export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l1-game-api-sit2-service:5000",
        authUrl: "http://l1-auth-api-sit2-service:5000",
        client: {
            id: "game-server",
            secret: "gameserver@20luminet&",
        },
        useAuthenticate: true,
        requestTimeout: 10000,
        placeBetTimeout: 10000,
        enabledApiLogs: true,
    },
    authenticateSettings: {
        url: "http://l1-auth-api-sit2-service:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l1-user-service-sit2-service:5000",
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
        url: "mongodb://lmn_backend:LmnBackend%40517@172.16.4.111:31301/?replicaSet=SabaSIT&appName=MiniRoulette",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
    sentry: {
        sentryUrl: "http://50e405ebce7003a0e1edbda2bf28b14c@sentryuat-sc.nebula.prod/3",
        logIdentifier: "mini-roulette",
        env: "SIT_2",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l1-game-management-service-sit2-service:5000",
    },
    otel: {
        system: "SG",
        enabled: false,
        endpoint: "http://10.2.190.51:4318/v1/traces",
    },
};
