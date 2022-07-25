import {
    Deposited as DepositedEvent,
    ImRatioChanged as ImRatioChangedEvent,
    LiquidityAdded as LiquidityAddedExchangeEvent,
    LiquidityRemoved as LiquidityRemovedExchangeEvent,
    MaxMarketsPerAccountChanged as MaxMarketsPerAccountChangedEvent,
    MmRatioChanged as MmRatioChangedEvent,
    PositionChanged as PositionChangedEvent,
    PositionLiquidated as PositionLiquidatedEvent,
    ProtocolFeeTransferred as ProtocolFeeTransferredEvent,
    Withdrawn as WithdrawnEvent,
} from "../../generated/PerpdexExchange/PerpdexExchange"
import {
    Deposited,
    ImRatioChanged,
    LiquidityAddedExchange,
    LiquidityRemovedExchange,
    MaxMarketsPerAccountChanged,
    MmRatioChanged,
    PositionChanged,
    ProtocolFeeTransferred,
    Withdrawn,
} from "../../generated/schema"
import { BI_ZERO, Q96 } from "../utils/constants"
import { pushMarket } from "../utils/model"
import {
    createCandle,
    createLiquidityHistory,
    createPositionHistory,
    getBlockNumberLogIndex,
    getOrCreateDaySummary,
    getOrCreateMarket,
    getOrCreateProtocol,
    getOrCreateTrader,
    getOrCreateTraderMakerInfo,
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

export function handleWithdrawn(event: WithdrawnEvent): void {
    const withdrawn = new Withdrawn(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    withdrawn.exchange = event.address.toHexString()
    withdrawn.blockNumberLogIndex = getBlockNumberLogIndex(event)
    withdrawn.timestamp = event.block.timestamp
    withdrawn.trader = event.params.trader.toHexString()
    withdrawn.amount = event.params.amount

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    trader.collateralBalance = trader.collateralBalance.minus(withdrawn.amount)
    trader.timestamp = event.block.timestamp

    const protocol = getOrCreateProtocol()
    protocol.timestamp = event.block.timestamp

    withdrawn.save()
    trader.save()
    protocol.save()
}

export function handleProtocolFeeTransferred(event: ProtocolFeeTransferredEvent): void {
    const protocolFeeTransferred = new ProtocolFeeTransferred(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    protocolFeeTransferred.exchange = event.address.toHexString()
    protocolFeeTransferred.blockNumberLogIndex = getBlockNumberLogIndex(event)
    protocolFeeTransferred.timestamp = event.block.timestamp
    protocolFeeTransferred.trader = event.params.trader.toHexString()
    protocolFeeTransferred.amount = event.params.amount

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    trader.collateralBalance = trader.collateralBalance.plus(protocolFeeTransferred.amount)
    trader.timestamp = event.block.timestamp

    const protocol = getOrCreateProtocol()
    protocol.protocolFee = protocol.protocolFee.minus(protocolFeeTransferred.amount)
    protocol.timestamp = event.block.timestamp

    protocolFeeTransferred.save()
    trader.save()
    protocol.save()
}

export function handleLiquidityAddedExchange(event: LiquidityAddedExchangeEvent): void {
    const liquidityAddedExchange = new LiquidityAddedExchange(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    liquidityAddedExchange.exchange = event.address.toHexString()
    liquidityAddedExchange.blockNumberLogIndex = getBlockNumberLogIndex(event)
    liquidityAddedExchange.timestamp = event.block.timestamp
    liquidityAddedExchange.trader = event.params.trader.toHexString()
    liquidityAddedExchange.market = event.params.market.toHexString()
    liquidityAddedExchange.base = event.params.base
    liquidityAddedExchange.quote = event.params.quote
    liquidityAddedExchange.liquidity = event.params.liquidity
    liquidityAddedExchange.cumBasePerLiquidityX96 = event.params.cumBasePerLiquidityX96
    liquidityAddedExchange.cumQuotePerLiquidityX96 = event.params.cumQuotePerLiquidityX96
    liquidityAddedExchange.baseBalancePerShareX96 = event.params.baseBalancePerShareX96
    liquidityAddedExchange.sharePriceAfterX96 = event.params.sharePriceAfterX96

    const protocol = getOrCreateProtocol()
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(liquidityAddedExchange.market)
    market.baseBalancePerShareX96 = liquidityAddedExchange.baseBalancePerShareX96
    market.sharePriceAfterX96 = liquidityAddedExchange.sharePriceAfterX96
    market.timestamp = event.block.timestamp

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    pushMarket(trader.markets, liquidityAddedExchange.market)
    trader.timestamp = event.block.timestamp

    const traderMakerInfo = getOrCreateTraderMakerInfo(liquidityAddedExchange.trader, liquidityAddedExchange.market)
    traderMakerInfo.liquidity = traderMakerInfo.liquidity.plus(liquidityAddedExchange.liquidity)
    traderMakerInfo.cumBaseSharePerLiquidityX96 = liquidityAddedExchange.cumBasePerLiquidityX96
    traderMakerInfo.cumQuotePerLiquidityX96 = liquidityAddedExchange.cumQuotePerLiquidityX96
    traderMakerInfo.timestamp = event.block.timestamp

    createLiquidityHistory(
        liquidityAddedExchange.trader,
        liquidityAddedExchange.market,
        event.block.timestamp,
        liquidityAddedExchange.base,
        liquidityAddedExchange.quote,
        liquidityAddedExchange.liquidity,
    )

    createCandle(
        liquidityAddedExchange.market,
        event.block.timestamp,
        liquidityAddedExchange.sharePriceAfterX96,
        liquidityAddedExchange.baseBalancePerShareX96,
        BI_ZERO,
        BI_ZERO,
    )

    liquidityAddedExchange.save()
    protocol.save()
    market.save()
    trader.save()
    traderMakerInfo.save()
}

export function handleLiquidityRemovedExchange(event: LiquidityRemovedExchangeEvent): void {
    const liquidityRemovedExchange = new LiquidityRemovedExchange(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    liquidityRemovedExchange.exchange = event.address.toHexString()
    liquidityRemovedExchange.blockNumberLogIndex = getBlockNumberLogIndex(event)
    liquidityRemovedExchange.timestamp = event.block.timestamp
    liquidityRemovedExchange.trader = event.params.trader.toHexString()
    liquidityRemovedExchange.market = event.params.market.toHexString()
    liquidityRemovedExchange.liquidator = event.params.liquidator.toHexString()
    liquidityRemovedExchange.base = event.params.base
    liquidityRemovedExchange.quote = event.params.quote
    liquidityRemovedExchange.liquidity = event.params.liquidity
    liquidityRemovedExchange.takerBase = event.params.takerBase
    liquidityRemovedExchange.takerQuote = event.params.takerQuote
    liquidityRemovedExchange.realizedPnl = event.params.realizedPnl
    liquidityRemovedExchange.baseBalancePerShareX96 = event.params.baseBalancePerShareX96
    liquidityRemovedExchange.sharePriceAfterX96 = event.params.sharePriceAfterX96

    const protocol = getOrCreateProtocol()
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(liquidityRemovedExchange.market)
    market.baseBalancePerShareX96 = liquidityRemovedExchange.baseBalancePerShareX96
    market.sharePriceAfterX96 = liquidityRemovedExchange.sharePriceAfterX96
    market.timestamp = event.block.timestamp

    const trader = getOrCreateTrader(liquidityRemovedExchange.trader)
    pushMarket(trader.markets, liquidityRemovedExchange.market)
    trader.collateralBalance = trader.collateralBalance.plus(liquidityRemovedExchange.realizedPnl)
    trader.timestamp = event.block.timestamp

    const traderTakerInfo = getOrCreateTraderTakerInfo(liquidityRemovedExchange.trader, liquidityRemovedExchange.market)
    traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(liquidityRemovedExchange.takerBase)
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare
        .times(liquidityRemovedExchange.baseBalancePerShareX96)
        .div(Q96)
    traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
        .plus(liquidityRemovedExchange.takerQuote)
        .minus(liquidityRemovedExchange.realizedPnl)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = event.block.timestamp

    const traderMakerInfo = getOrCreateTraderMakerInfo(liquidityRemovedExchange.trader, liquidityRemovedExchange.market)
    traderMakerInfo.liquidity = traderMakerInfo.liquidity.minus(liquidityRemovedExchange.liquidity)
    traderMakerInfo.timestamp = event.block.timestamp

    const daySummary = getOrCreateDaySummary(liquidityRemovedExchange.trader, event.block.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(liquidityRemovedExchange.realizedPnl)
    daySummary.timestamp = event.block.timestamp

    createLiquidityHistory(
        liquidityRemovedExchange.trader,
        liquidityRemovedExchange.market,
        event.block.timestamp,
        liquidityRemovedExchange.base.neg(),
        liquidityRemovedExchange.quote.neg(),
        liquidityRemovedExchange.liquidity.neg(),
    )

    createCandle(
        liquidityRemovedExchange.market,
        event.block.timestamp,
        liquidityRemovedExchange.sharePriceAfterX96,
        liquidityRemovedExchange.baseBalancePerShareX96,
        BI_ZERO,
        BI_ZERO,
    )

    liquidityRemovedExchange.save()
    protocol.save()
    market.save()
    trader.save()
    traderTakerInfo.save()
    traderMakerInfo.save()
    daySummary.save()
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

export function handlePositionLiquidated(event: PositionLiquidatedEvent): void {
    const positionLiquidated = new PositionChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    positionLiquidated.exchange = event.address.toHexString()
    positionLiquidated.blockNumberLogIndex = getBlockNumberLogIndex(event)
    positionLiquidated.timestamp = event.block.timestamp
    positionLiquidated.trader = event.params.trader.toHexString()
    positionLiquidated.market = event.params.market.toHexString()
    positionLiquidated.liquidator = event.params.liquidator.toHexString()
    positionLiquidated.base = event.params.base
    positionLiquidated.quote = event.params.quote
    positionLiquidated.realizedPnl = event.params.realizedPnl
    positionLiquidated.protocolFee = event.params.protocolFee
    positionLiquidated.baseBalancePerShareX96 = event.params.baseBalancePerShareX96
    positionLiquidated.sharePriceAfterX96 = event.params.sharePriceAfterX96
    positionLiquidated.liquidationPenalty = event.params.liquidationPenalty
    positionLiquidated.liquidationReward = event.params.liquidationReward
    positionLiquidated.insuranceFundReward = event.params.insuranceFundReward

    const protocol = getOrCreateProtocol()
    protocol.protocolFee = protocol.protocolFee.plus(positionLiquidated.protocolFee)
    protocol.insuranceFundBalance = protocol.insuranceFundBalance.plus(positionLiquidated.insuranceFundReward!)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(positionLiquidated.market)
    market.baseBalancePerShareX96 = positionLiquidated.baseBalancePerShareX96
    market.sharePriceAfterX96 = positionLiquidated.sharePriceAfterX96
    market.timestamp = event.block.timestamp

    const trader = getOrCreateTrader(positionLiquidated.trader)
    pushMarket(trader.markets, positionLiquidated.market)
    trader.collateralBalance = trader.collateralBalance
        .plus(positionLiquidated.realizedPnl)
        .minus(positionLiquidated.liquidationPenalty!)
    trader.timestamp = event.block.timestamp

    const liquidator = getOrCreateTrader(positionLiquidated.liquidator!)
    pushMarket(trader.markets, positionLiquidated.market)
    trader.collateralBalance = trader.collateralBalance.plus(positionLiquidated.liquidationReward!)
    trader.timestamp = event.block.timestamp

    const traderTakerInfo = getOrCreateTraderTakerInfo(positionLiquidated.trader, positionLiquidated.market)
    traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(positionLiquidated.base)
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare
        .times(positionLiquidated.baseBalancePerShareX96)
        .div(Q96)
    traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
        .plus(positionLiquidated.quote)
        .minus(positionLiquidated.realizedPnl)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = event.block.timestamp

    const daySummary = getOrCreateDaySummary(event.params.trader.toHexString(), event.block.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(positionLiquidated.realizedPnl)
    daySummary.timestamp = event.block.timestamp

    createPositionHistory(
        positionLiquidated.trader,
        positionLiquidated.market,
        event.block.timestamp,
        positionLiquidated.base,
        positionLiquidated.baseBalancePerShareX96,
        positionLiquidated.quote,
        positionLiquidated.realizedPnl,
        positionLiquidated.protocolFee,
    )

    createCandle(
        positionLiquidated.market,
        event.block.timestamp,
        positionLiquidated.sharePriceAfterX96,
        positionLiquidated.baseBalancePerShareX96,
        positionLiquidated.base,
        positionLiquidated.quote,
    )

    positionLiquidated.save()
    protocol.save()
    market.save()
    trader.save()
    liquidator.save()
    traderTakerInfo.save()
    daySummary.save()
}

export function handleMaxMarketsPerAccountChanged(event: MaxMarketsPerAccountChangedEvent): void {
    const maxMarketsPerAccountChanged = new MaxMarketsPerAccountChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    maxMarketsPerAccountChanged.exchange = event.address.toHexString()
    maxMarketsPerAccountChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    maxMarketsPerAccountChanged.timestamp = event.block.timestamp
    maxMarketsPerAccountChanged.value = event.params.value

    const protocol = getOrCreateProtocol()
    protocol.maxMarketsPerAccount = maxMarketsPerAccountChanged.value
    protocol.timestamp = event.block.timestamp

    maxMarketsPerAccountChanged.save()
    protocol.save()
}

export function handleImRatioChanged(event: ImRatioChangedEvent): void {
    const imRatioChanged = new ImRatioChanged(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    imRatioChanged.exchange = event.address.toHexString()
    imRatioChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    imRatioChanged.timestamp = event.block.timestamp
    imRatioChanged.value = event.params.value

    const protocol = getOrCreateProtocol()
    protocol.imRatio = imRatioChanged.value
    protocol.timestamp = event.block.timestamp

    imRatioChanged.save()
    protocol.save()
}

export function handleMmRatioChanged(event: MmRatioChangedEvent): void {
    const mmRatioChanged = new MmRatioChanged(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    mmRatioChanged.exchange = event.address.toHexString()
    mmRatioChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    mmRatioChanged.timestamp = event.block.timestamp
    mmRatioChanged.value = event.params.value

    const protocol = getOrCreateProtocol()
    protocol.mmRatio = mmRatioChanged.value
    protocol.timestamp = event.block.timestamp

    mmRatioChanged.save()
    protocol.save()
}
