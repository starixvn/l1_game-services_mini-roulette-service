import mongoose from "mongoose";
import { users } from "sc-base-database";
import { middlewares } from "sc-common";
import {
    createCurrencyGroupGames,
    createDummyCurrency,
    createDummyUsers,
    createExchangeRate,
    createGameConfig,
    createPartnerConfig,
    normalUser,
} from "sc-game-service-integration-utils";

import appConfigs from "../../../build/app-configs.IGT";
import { currencyData, game, gameConfig, rounds } from "./test-data";
import MiniRouletteRounds from "../../../build/models/roulette-rounds";

const connectDatabase = async () => {
    await middlewares.database.configureDatabase(mongoose, appConfigs.database);

    await clearAllData();
};

const clearAllData = async () => {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
        await collection.drop();
    }
};
const createRounds = async (uid) => {
    return MiniRouletteRounds.insertMany(rounds(uid));
};

const getUserId = async () => {
    const user = await users.findOne({ "local.playerId": normalUser.playerId }, { _id: true }).lean();
    return user._id.toString();
};

export const createTestData = async () => {
    await connectDatabase();
    await createExchangeRate();
    await createGameConfig(gameConfig);
    const partnerConfig = await createPartnerConfig(game.id);

    const currency = await createDummyCurrency(partnerConfig.partnerId, currencyData.code, currencyData.name);
    await createCurrencyGroupGames(currency.groupId, game.id, gameConfig);
    await createDummyUsers(currency);
    const userId = await getUserId();
    await createRounds(userId);

    console.log("Create exchange rate, game config & dummy user for testing successfully!");
    process.exit(0);
};
createTestData();
