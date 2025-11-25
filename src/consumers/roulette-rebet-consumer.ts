import { PlaceBetConsumer } from ".";

export default class RouletteRebetConsumer {
    declare placeBetConsumer: PlaceBetConsumer;
    constructor({ placeBetConsumer }: { placeBetConsumer: PlaceBetConsumer }) {
        this.placeBetConsumer = placeBetConsumer;
    }

    consume(player: any, payload: any) {
        if (!payload || !payload.betChoices) {
            return;
        }
        this.splitBetChoices(payload).forEach((betPayload) => this.placeBetConsumer.consume(player, betPayload));
    }

    private splitBetChoices(payload: { betChoices: Record<string, Record<string, number>> }) {
        return Object.entries(payload.betChoices).flatMap(([betType, choices]) =>
            Object.entries(choices).map(([choice, amount]) => ({
                betChoices: { [betType]: { [choice]: amount } },
                freeBet: false,
                receivedTime: new Date(),
            }))
        );
    }
}
