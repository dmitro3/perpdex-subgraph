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

export function isWithinPeriod(timestamp: BigInt, startedAt: BigInt, finishedAt: BigInt): boolean {
    return timestamp.ge(startedAt) && timestamp.le(finishedAt)
}
