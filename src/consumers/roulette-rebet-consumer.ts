import { PlaceBetConsumer, ActionSettleConsumer } from ".";

export default class RouletteRebetConsumer {
    declare placeBetConsumer: PlaceBetConsumer;
    declare actionSettleConsumer: ActionSettleConsumer;
    constructor({
        placeBetConsumer,
        actionSettleConsumer,
    }: {
        placeBetConsumer: PlaceBetConsumer;
        actionSettleConsumer: ActionSettleConsumer;
    }) {
        this.placeBetConsumer = placeBetConsumer;
        this.actionSettleConsumer = actionSettleConsumer;
    }

    consume(player: any, payload: any) {
        if (!payload || !payload.betChoices) {
            return;
        }
        this.splitBetChoices(payload).forEach((betPayload) => this.placeBetConsumer.consume(player, betPayload));
        this.actionSettleConsumer.consume(player);
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
