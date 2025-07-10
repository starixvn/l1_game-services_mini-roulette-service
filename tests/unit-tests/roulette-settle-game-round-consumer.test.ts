// Mock the base class before importing the class under test
jest.mock("sc-game-base/src/core/event-consumers", () => {
    return {
        SettleGameRoundConsumer: class {
            constructor(props: any) {}
        },
    };
});

import RouletteSettleGameRoundConsumer from "../../src/consumers/roulette-settle-game-round-consumer";

describe("RouletteSettleGameRoundConsumer.settleBet", () => {
    let consumer: RouletteSettleGameRoundConsumer;
    let mockBet: any;
    let mockGuaranteedFeatureConsumer: any;
    let mockRound: any;
    let mockGameData: any;
    let mockUserBetResultPublisher: any;

    beforeEach(() => {
        mockGuaranteedFeatureConsumer = {
            calculateGuaranteedFeatureStatus: jest.fn(),
        };
        mockRound = {
            id: 1,
            time: new Date(),
            result: { some: "result" },
            settlementResult: { some: "settlement" },
        };
        mockGameData = {
            gameConfigs: { odds: { someType: 2 } },
            ingame: {},
            accumulatedDays: 1,
            playerBetHistory: {},
        };
        mockUserBetResultPublisher = {
            publishToUser: jest.fn(),
            publish: jest.fn(),
        };

        consumer = new RouletteSettleGameRoundConsumer({
            roundResultConsumer: {},
            guaranteedFeatureConsumer: mockGuaranteedFeatureConsumer,
        });
        consumer.gameData = mockGameData;
        consumer.userBetResultPublisher = mockUserBetResultPublisher;
        consumer.findOrCreateRound = jest.fn().mockResolvedValue(mockRound);
        consumer.calculateBetResult = jest.fn().mockReturnValue({
            totalWin: 100,
            totalBetAmount: 50,
            netWin: 50,
            totalLost: 0,
            winningByChoices: {},
        });
        consumer.createMetadata = jest.fn().mockReturnValue({
            BetDetails: [
                { ChoiceId: 1, ValidBetAmount: 10, TotalAmount: 10, TotalWin: 20 },
                { ChoiceId: 2, ValidBetAmount: 5, TotalAmount: 5, TotalWin: 0 },
            ],
        });
        consumer.callEndGame = jest.fn();
        consumer.captureBetHistory = jest.fn();
        consumer.resetPlayerData = jest.fn();

        mockBet = {
            uid: "user1",
            name: "player1",
            odds: { someType: 2 },
            save: jest.fn().mockResolvedValue(undefined),
            set: jest.fn(),
            time: new Date(),
        };
    });

    it("should call calculateGuaranteedFeatureStatus and findOrCreateRound", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus).toHaveBeenCalledWith(mockBet);
        expect(consumer.findOrCreateRound).toHaveBeenCalledWith(mockBet, {
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });
    });

    it("should set betwin and paid on bet", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockBet.betwin).toBe(100);
        expect(mockBet.paid).toBe(true);
    });

    it("should set guaranteedWinStatus and guaranteedLossStatus on bet", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockBet.guaranteedWinStatus).toBe("active");
        expect(mockBet.guaranteedLossStatus).toBe("inactive");
    });

    it("should set settlementDetails on bet", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockBet.settlementDetails).toEqual([
            { choiceId: 1, totalAmount: 10, validBetAmount: 10, totalWin: 20 },
            { choiceId: 2, totalAmount: 5, validBetAmount: 5, totalWin: 0 },
        ]);
    });

    it("should call bet.save and callEndGame", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockBet.save).toHaveBeenCalled();
        expect(consumer.callEndGame).toHaveBeenCalled();
    });

    it("should call captureBetHistory and publishToUser", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(consumer.captureBetHistory).toHaveBeenCalled();
        expect(mockUserBetResultPublisher.publishToUser).toHaveBeenCalled();
    });

    it("should call publish and resetPlayerData", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockUserBetResultPublisher.publish).toHaveBeenCalled();
        expect(consumer.resetPlayerData).toHaveBeenCalledWith("player1");
    });

    it("should return early and not call save or callEndGame if round is not found", async () => {
        // Arrange
        consumer.findOrCreateRound = jest.fn().mockResolvedValue(null);

        // Act
        await consumer.settleBet(mockBet);

        // Assert
        expect(mockBet.save).not.toHaveBeenCalled();
        expect(consumer.callEndGame).not.toHaveBeenCalled();
    });

    it("should map metaData.BetDetails to bet.settlementDetails correctly", async () => {
        // Arrange
        mockGuaranteedFeatureConsumer.calculateGuaranteedFeatureStatus.mockResolvedValue({
            guaranteedWinStatus: "active",
            guaranteedLossStatus: "inactive",
        });
        // Act
        await consumer.settleBet(mockBet);
        // Assert
        expect(mockBet.settlementDetails).toEqual([
            { choiceId: 1, totalAmount: 10, validBetAmount: 10, totalWin: 20 },
            { choiceId: 2, totalAmount: 5, validBetAmount: 5, totalWin: 0 },
        ]);
    });
});
