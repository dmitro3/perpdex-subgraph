import { BigInt } from "@graphprotocol/graph-ts"

export const BI_ZERO = BigInt.fromI32(0)
export const STR_ZERO = "0"
export const Q96 = BigInt.fromI32(2).pow(96)
// export const Q96 = BigInt.fromI64(2 ** 96)

export const m5 = 300
export const m15 = 900
export const h1 = 3600
export const d1 = 86400

export const MAX_LOG_COUNT = 10000

export const bid = "bid"
export const ask = "ask"
