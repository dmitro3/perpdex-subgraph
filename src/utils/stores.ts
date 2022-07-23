import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { Protocol, Trader } from "../../generated/schema"
import { ChainId, Network, Version } from "../constants"
import { BI_ZERO, MAX_LOG_COUNT } from "./constants"

export function getBlockNumberLogIndex(event: ethereum.Event): BigInt {
    return event.block.number.times(BigInt.fromI32(MAX_LOG_COUNT)).plus(event.logIndex)
}

export function getOrCreateTrader(traderAddr: string): Trader {
    let trader = Trader.load(traderAddr)
    if (!trader) {
        trader = new Trader(traderAddr)
        trader.collateralBalance = BI_ZERO
        trader.markets = []
        trader.timestamp = BI_ZERO
        trader.save()
    }
    return trader
}

const protocolId = "perpdex"

export function getOrCreateProtocol(): Protocol {
    let protocol = Protocol.load(protocolId)
    if (!protocol) {
        protocol = new Protocol(protocolId)
        protocol.network = Network
        protocol.chainId = ChainId
        protocol.contractVersion = Version
        protocol.takerVolume = BI_ZERO
        protocol.makerVolume = BI_ZERO
        protocol.publicMarketCount = BI_ZERO
        protocol.protocolFee = BI_ZERO
        protocol.insuranceFundBalance = BI_ZERO
        protocol.maxMarketsPerAccount = 0
        protocol.imRatio = 0
        protocol.mmRatio = 0
        protocol.rewardRatio = 0
        protocol.smoothEmaTime = 0
        protocol.protocolFeeRatio = 0
        protocol.timestamp = BI_ZERO
        protocol.save()
    }
    return protocol
}
