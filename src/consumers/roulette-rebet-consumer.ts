import { PlaceBetConsumer, HandleActionSettleConsumer } from ".";

export default class RouletteRebetConsumer {
    declare placeBetConsumer: PlaceBetConsumer;
    declare handleActionSettleConsumer: HandleActionSettleConsumer;
    constructor({
        placeBetConsumer,
        handleActionSettleConsumer,
    }: {
        placeBetConsumer: PlaceBetConsumer;
        handleActionSettleConsumer: HandleActionSettleConsumer;
    }) {
        this.placeBetConsumer = placeBetConsumer;
        this.handleActionSettleConsumer = handleActionSettleConsumer;
    }

    consume(player: any, payload: any) {
        if (!payload || !payload.betChoices) {
            return;
        }
        this.splitBetChoices(payload).forEach((betPayload) => this.placeBetConsumer.consume(player, betPayload));
        this.handleActionSettleConsumer.consume(player);
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
