import { BigInt } from "@graphprotocol/graph-ts"

export function pushMarket(markets: Array<string>, market: string): void {
    for (let i: i32 = 0; i < markets.length; i++) {
        if (markets[i] === market) {
            return
        }
    }
    markets.push(market)
    return
}

export function isWithinPeriod(timestamp: BigInt, startedAt: number, finishedAt: number): boolean {
    const ts = timestamp.toI32()
    return startedAt <= ts && ts <= finishedAt
}
