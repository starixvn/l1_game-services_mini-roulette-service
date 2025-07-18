import RouletteUserSigninConsumer from "../../../src/consumers/roulette-user-signin-consumer";
import LangliveUserSettingConsumer from "../../../src/consumers/langlive-user-setting-consumer";

// Mock the base class
jest.mock("sc-game-base", () => ({
    Table: {
        EventConsumers: {
            TableUserSignInConsumer: class {
                constructor(
                    definition: any,
                    gameData: any,
                    userSignInPublisher: any,
                    playGamePermissionValidator: any,
                    appConfigs: any,
                    gameManagementApiClientFactory: any
                ) {}
                handleSignInSuccess(socketClient: any, userInfo: any, userSession: any) {}
            },
        },
    },
}));

describe("RouletteUserSigninConsumer", () => {
    let consumer: RouletteUserSigninConsumer;
    let mockDefinition: any;
    let mockGameData: any;
    let mockUserSignInPublisher: any;
    let mockPlayGamePermissionValidator: any;
    let mockAppConfigs: any;
    let mockGameManagementApiClientFactory: any;
    let mockLangliveUserSettingConsumer: any;

    beforeEach(() => {
        mockDefinition = { name: "roulette" };
        mockGameData = { remainingTime: 30000 };
        mockUserSignInPublisher = {
            publishToUser: jest.fn(),
        };
        mockPlayGamePermissionValidator = {
            validate: jest.fn(),
        };
        mockAppConfigs = {
            gameId: "roulette",
        };
        mockGameManagementApiClientFactory = {
            create: jest.fn(),
        };
        mockLangliveUserSettingConsumer = {
            updateImageAndNickname: jest.fn(),
        };

        consumer = new RouletteUserSigninConsumer(
            mockDefinition,
            mockGameData,
            mockUserSignInPublisher,
            mockPlayGamePermissionValidator,
            mockAppConfigs,
            mockGameManagementApiClientFactory,
            mockLangliveUserSettingConsumer
        );
    });

    describe("constructor", () => {
        it("should initialize with all required dependencies", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteUserSigninConsumer);
            expect(consumer.langliveUserSettingConsumer).toBe(mockLangliveUserSettingConsumer);
        });

        it("should call parent constructor with correct parameters", () => {
            // Assert
            expect(consumer).toBeInstanceOf(RouletteUserSigninConsumer);
        });
    });

    describe("handleSignInSuccess", () => {
        it("should call parent handleSignInSuccess method", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerAvatarUrl: "https://example.com/avatar.jpg",
                playerNickname: "Player1",
            };

            // Mock the parent method
            const parentHandleSignInSuccessSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(parentHandleSignInSuccessSpy).toHaveBeenCalledWith(socketClient, userInfo, userSession);
        });

        it("should update image and nickname when both are provided", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerAvatarUrl: "https://example.com/avatar.jpg",
                playerNickname: "Player1",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).toHaveBeenCalledWith("user1", {
                avatarUrl: "https://example.com/avatar.jpg",
                nickname: "Player1",
            });
        });

        it("should not update image and nickname when avatarUrl is missing", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerNickname: "Player1",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).not.toHaveBeenCalled();
        });

        it("should not update image and nickname when nickname is missing", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerAvatarUrl: "https://example.com/avatar.jpg",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).not.toHaveBeenCalled();
        });

        it("should not update image and nickname when both are missing", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).not.toHaveBeenCalled();
        });

        it("should handle empty avatarUrl", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerAvatarUrl: "",
                playerNickname: "Player1",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).not.toHaveBeenCalled();
        });

        it("should handle empty nickname", () => {
            // Arrange
            const socketClient = { id: "socket-1" } as any;
            const userInfo = { userId: "user1", name: "Player1" };
            const userSession = {
                userId: "user1",
                playerAvatarUrl: "https://example.com/avatar.jpg",
                playerNickname: "",
            };

            // Mock the parent method
            jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(consumer)), "handleSignInSuccess");

            // Act
            consumer.handleSignInSuccess(socketClient, userInfo, userSession);

            // Assert
            expect(mockLangliveUserSettingConsumer.updateImageAndNickname).not.toHaveBeenCalled();
        });
    });
});
