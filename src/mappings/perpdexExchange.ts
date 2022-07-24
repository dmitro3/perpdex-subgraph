import {
    Deposited as DepositedEvent,
    PositionChanged as PositionChangedEvent,
} from "../../generated/PerpdexExchange/PerpdexExchange"
import { Deposited, PositionChanged } from "../../generated/schema"
import { BI_ZERO, Q96 } from "../utils/constants"
import { pushMarket } from "../utils/model"
import {
    createCandle,
    createPositionHistory,
    getBlockNumberLogIndex,
    getOrCreateDaySummary,
    getOrCreateMarket,
    getOrCreateProtocol,
    getOrCreateTrader,
    getOrCreateTraderTakerInfo,
} from "../utils/stores"

export function handleDeposited(event: DepositedEvent): void {
    const deposited = new Deposited(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    deposited.exchange = event.address.toHexString()
    deposited.blockNumberLogIndex = getBlockNumberLogIndex(event)
    deposited.timestamp = event.block.timestamp
    deposited.trader = event.params.trader.toHexString()
    deposited.amount = event.params.amount

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    trader.collateralBalance = trader.collateralBalance.plus(deposited.amount)
    trader.timestamp = event.block.timestamp

    const protocol = getOrCreateProtocol()
    protocol.timestamp = event.block.timestamp

    deposited.save()
    trader.save()
    protocol.save()
}

export function handlePositionChanged(event: PositionChangedEvent): void {
    const positionChanged = new PositionChanged(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    positionChanged.exchange = event.address.toHexString()
    positionChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    positionChanged.timestamp = event.block.timestamp
    positionChanged.trader = event.params.trader.toHexString()
    positionChanged.market = event.params.market.toHexString()
    positionChanged.base = event.params.base
    positionChanged.quote = event.params.quote
    positionChanged.realizedPnl = event.params.realizedPnl
    positionChanged.protocolFee = event.params.protocolFee
    positionChanged.baseBalancePerShareX96 = event.params.baseBalancePerShareX96
    positionChanged.sharePriceAfterX96 = event.params.sharePriceAfterX96

    const protocol = getOrCreateProtocol()
    protocol.protocolFee = protocol.protocolFee.plus(positionChanged.protocolFee)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(positionChanged.market)
    market.baseBalancePerShareX96 = positionChanged.baseBalancePerShareX96
    market.sharePriceAfterX96 = positionChanged.sharePriceAfterX96
    market.timestamp = event.block.timestamp

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    pushMarket(trader.markets, positionChanged.market)
    trader.collateralBalance = trader.collateralBalance.plus(positionChanged.realizedPnl)
    trader.timestamp = event.block.timestamp

    const traderTakerInfo = getOrCreateTraderTakerInfo(positionChanged.trader, positionChanged.market)
    traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(positionChanged.base)
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare
        .times(positionChanged.baseBalancePerShareX96)
        .div(Q96)
    traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
        .plus(positionChanged.quote)
        .minus(positionChanged.realizedPnl)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = event.block.timestamp

    const daySummary = getOrCreateDaySummary(event.params.trader.toHexString(), event.block.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(positionChanged.realizedPnl)
    daySummary.timestamp = event.block.timestamp

    createPositionHistory(
        positionChanged.trader,
        positionChanged.market,
        event.block.timestamp,
        positionChanged.base,
        positionChanged.baseBalancePerShareX96,
        positionChanged.quote,
        positionChanged.realizedPnl,
        positionChanged.protocolFee,
    )

    createCandle(
        positionChanged.market,
        event.block.timestamp,
        positionChanged.sharePriceAfterX96,
        positionChanged.baseBalancePerShareX96,
        positionChanged.base,
        positionChanged.quote,
    )

    positionChanged.save()
    protocol.save()
    market.save()
    trader.save()
    traderTakerInfo.save()
    daySummary.save()
}
