import {
    CollateralBalanceSet as CollateralBalanceSetEvent,
    CollateralCompensated as CollateralCompensatedEvent,
    Deposited as DepositedEvent,
    ImRatioChanged as ImRatioChangedEvent,
    LimitOrderCanceled as LimitOrderCanceledExchangeEvent,
    LimitOrderCreated as LimitOrderCreatedExchangeEvent,
    LimitOrderSettled as LimitOrderSettledEvent,
    LiquidationRewardConfigChanged as LiquidationRewardConfigChangedEvent,
    LiquidityAdded as LiquidityAddedExchangeEvent,
    LiquidityRemoved as LiquidityRemovedExchangeEvent,
    MarketClosed as MarketClosedEvent,
    MarketStatusChanged as MarketStatusChangedEvent,
    MaxMarketsPerAccountChanged as MaxMarketsPerAccountChangedEvent,
    MaxOrdersPerAccountChanged as MaxOrdersPerAccountChangedEvent,
    MmRatioChanged as MmRatioChangedEvent,
    PartiallyExecuted as PartiallyExecutedEvent,
    PositionChanged as PositionChangedEvent,
    PositionLiquidated as PositionLiquidatedEvent,
    ProtocolFeeRatioChanged as ProtocolFeeRatioChangedEvent,
    ProtocolFeeTransferred as ProtocolFeeTransferredEvent,
    Withdrawn as WithdrawnEvent,
} from "../../generated/PerpdexExchange/PerpdexExchange"
import {
    CollateralBalanceSet,
    CollateralCompensated,
    Deposited,
    ImRatioChanged,
    LimitOrderCanceledExchange,
    LimitOrderCreatedExchange,
    LimitOrderSettled,
    LiquidationRewardConfigChanged,
    LiquidityAddedExchange,
    LiquidityRemovedExchange,
    MarketClosed,
    MarketStatusChanged,
    MaxMarketsPerAccountChanged,
    MaxOrdersPerAccountChanged,
    MmRatioChanged,
    PartiallyExecuted,
    PositionChanged,
    ProtocolFeeRatioChanged,
    ProtocolFeeTransferred,
    Withdrawn,
} from "../../generated/schema"
import { PerpdexMarket } from "../../generated/templates"
import { BI_ZERO, competitionFinishedAt, competitionStartedAt, Q96 } from "../utils/constants"
import { isWithinPeriod, pushMarket } from "../utils/model"
import {
    addAskOrderRow,
    addBidOrderRow,
    createCandle,
    createLiquidityHistory,
    createPositionHistory,
    deleteOrder,
    excludeAskOrderRow,
    excludeBidOrderRow,
    getBlockNumberLogIndex,
    getOrCreateDaySummary,
    getOrCreateMarket,
    getOrCreateOrder,
    getOrCreateOrderBook,
    getOrCreateProfitRatio,
    getOrCreateProtocol,
    getOrCreateTrader,
    getOrCreateTraderMakerInfo,
    getOrCreateTraderTakerInfo,
} from "../utils/stores"

export function handleCollateralBalanceSet(event: CollateralBalanceSetEvent): void {
    const collateralBalanceSet = new CollateralBalanceSet(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    collateralBalanceSet.exchange = event.address.toHexString()
    collateralBalanceSet.blockNumberLogIndex = getBlockNumberLogIndex(event)
    collateralBalanceSet.timestamp = event.block.timestamp
    collateralBalanceSet.trader = event.params.trader.toHexString()
    collateralBalanceSet.beforeBalance = event.params.beforeBalance
    collateralBalanceSet.afterBalance = event.params.afterBalance

    const trader = getOrCreateTrader(collateralBalanceSet.trader)
    trader.collateralBalance = trader.collateralBalance
        .plus(collateralBalanceSet.afterBalance)
        .minus(collateralBalanceSet.beforeBalance)
    trader.timestamp = collateralBalanceSet.timestamp

    if (isWithinPeriod(collateralBalanceSet.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(
            collateralBalanceSet.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatio.deposit = profitRatio.deposit
            .plus(collateralBalanceSet.afterBalance)
            .minus(collateralBalanceSet.beforeBalance)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    collateralBalanceSet.save()
    trader.save()
}

export function handleCollateralCompensated(event: CollateralCompensatedEvent): void {
    const collateralCompensated = new CollateralCompensated(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    collateralCompensated.exchange = event.address.toHexString()
    collateralCompensated.blockNumberLogIndex = getBlockNumberLogIndex(event)
    collateralCompensated.timestamp = event.block.timestamp
    collateralCompensated.trader = event.params.trader.toHexString()
    collateralCompensated.amount = event.params.amount

    const protocol = getOrCreateProtocol()
    protocol.insuranceFundBalance = protocol.insuranceFundBalance.minus(collateralCompensated.amount)
    protocol.timestamp = collateralCompensated.timestamp

    const trader = getOrCreateTrader(collateralCompensated.trader)
    trader.collateralBalance = trader.collateralBalance.plus(collateralCompensated.amount)
    trader.timestamp = collateralCompensated.timestamp

    if (isWithinPeriod(collateralCompensated.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(
            collateralCompensated.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatio.deposit = profitRatio.deposit.plus(collateralCompensated.amount)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    collateralCompensated.save()
    protocol.save()
    trader.save()
}

export function handleDeposited(event: DepositedEvent): void {
    const deposited = new Deposited(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    deposited.exchange = event.address.toHexString()
    deposited.blockNumberLogIndex = getBlockNumberLogIndex(event)
    deposited.timestamp = event.block.timestamp
    deposited.trader = event.params.trader.toHexString()
    deposited.amount = event.params.amount

    const trader = getOrCreateTrader(deposited.trader)
    trader.collateralBalance = trader.collateralBalance.plus(deposited.amount)
    trader.timestamp = deposited.timestamp

    if (isWithinPeriod(deposited.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(deposited.trader, competitionStartedAt, competitionFinishedAt)
        profitRatio.deposit = profitRatio.deposit.plus(deposited.amount)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    deposited.save()
    trader.save()
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
    trader.timestamp = withdrawn.timestamp

    withdrawn.save()
    trader.save()
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

    const protocol = getOrCreateProtocol()
    protocol.protocolFee = protocol.protocolFee.minus(protocolFeeTransferred.amount)
    protocol.timestamp = protocolFeeTransferred.timestamp

    const trader = getOrCreateTrader(event.params.trader.toHexString())
    trader.collateralBalance = trader.collateralBalance.plus(protocolFeeTransferred.amount)
    trader.timestamp = protocolFeeTransferred.timestamp

    if (isWithinPeriod(protocolFeeTransferred.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(
            protocolFeeTransferred.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatio.profit = profitRatio.profit.plus(protocolFeeTransferred.amount)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    protocolFeeTransferred.save()
    protocol.save()
    trader.save()
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

    const trader = getOrCreateTrader(liquidityAddedExchange.trader)
    pushMarket(trader.markets, liquidityAddedExchange.market)
    trader.timestamp = liquidityAddedExchange.timestamp

    const traderMakerInfo = getOrCreateTraderMakerInfo(liquidityAddedExchange.trader, liquidityAddedExchange.market)
    traderMakerInfo.liquidity = traderMakerInfo.liquidity.plus(liquidityAddedExchange.liquidity)
    traderMakerInfo.cumBaseSharePerLiquidityX96 = liquidityAddedExchange.cumBasePerLiquidityX96
    traderMakerInfo.cumQuotePerLiquidityX96 = liquidityAddedExchange.cumQuotePerLiquidityX96
    traderMakerInfo.timestamp = liquidityAddedExchange.timestamp

    createLiquidityHistory(
        liquidityAddedExchange.trader,
        liquidityAddedExchange.market,
        liquidityAddedExchange.timestamp,
        liquidityAddedExchange.base,
        liquidityAddedExchange.quote,
        liquidityAddedExchange.liquidity,
    )

    liquidityAddedExchange.save()
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

    const trader = getOrCreateTrader(liquidityRemovedExchange.trader)
    pushMarket(trader.markets, liquidityRemovedExchange.market)
    trader.collateralBalance = trader.collateralBalance.plus(liquidityRemovedExchange.realizedPnl)
    trader.timestamp = liquidityRemovedExchange.timestamp

    const market = getOrCreateMarket(liquidityRemovedExchange.market)

    const traderTakerInfo = getOrCreateTraderTakerInfo(liquidityRemovedExchange.trader, liquidityRemovedExchange.market)
    traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(liquidityRemovedExchange.takerBase)
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare.times(market.baseBalancePerShareX96).div(Q96)
    traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
        .plus(liquidityRemovedExchange.takerQuote)
        .minus(liquidityRemovedExchange.realizedPnl)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = liquidityRemovedExchange.timestamp

    const traderMakerInfo = getOrCreateTraderMakerInfo(liquidityRemovedExchange.trader, liquidityRemovedExchange.market)
    traderMakerInfo.liquidity = traderMakerInfo.liquidity.minus(liquidityRemovedExchange.liquidity)
    traderMakerInfo.timestamp = liquidityRemovedExchange.timestamp

    const daySummary = getOrCreateDaySummary(liquidityRemovedExchange.trader, liquidityRemovedExchange.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(liquidityRemovedExchange.realizedPnl)
    daySummary.timestamp = liquidityRemovedExchange.timestamp

    if (isWithinPeriod(liquidityRemovedExchange.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(
            liquidityRemovedExchange.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatio.profit = profitRatio.profit.plus(liquidityRemovedExchange.realizedPnl)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    createLiquidityHistory(
        liquidityRemovedExchange.trader,
        liquidityRemovedExchange.market,
        liquidityRemovedExchange.timestamp,
        liquidityRemovedExchange.base,
        liquidityRemovedExchange.quote,
        liquidityRemovedExchange.liquidity,
    )

    liquidityRemovedExchange.save()
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
    protocol.timestamp = positionChanged.timestamp

    const market = getOrCreateMarket(positionChanged.market)
    market.baseBalancePerShareX96 = positionChanged.baseBalancePerShareX96
    market.sharePriceAfterX96 = positionChanged.sharePriceAfterX96
    market.timestamp = positionChanged.timestamp

    const trader = getOrCreateTrader(positionChanged.trader)
    pushMarket(trader.markets, positionChanged.market)
    trader.collateralBalance = trader.collateralBalance.plus(positionChanged.realizedPnl)
    trader.timestamp = positionChanged.timestamp

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
    traderTakerInfo.timestamp = positionChanged.timestamp

    const daySummary = getOrCreateDaySummary(positionChanged.trader, positionChanged.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(positionChanged.realizedPnl)
    daySummary.timestamp = positionChanged.timestamp

    if (isWithinPeriod(positionChanged.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(positionChanged.trader, competitionStartedAt, competitionFinishedAt)
        profitRatio.profit = profitRatio.profit.plus(positionChanged.realizedPnl)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    createPositionHistory(
        positionChanged.trader,
        positionChanged.market,
        positionChanged.timestamp,
        positionChanged.base,
        positionChanged.baseBalancePerShareX96,
        positionChanged.quote,
        positionChanged.realizedPnl,
        positionChanged.protocolFee,
    )

    createCandle(
        positionChanged.market,
        positionChanged.timestamp,
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
    protocol.timestamp = positionLiquidated.timestamp

    const market = getOrCreateMarket(positionLiquidated.market)
    market.baseBalancePerShareX96 = positionLiquidated.baseBalancePerShareX96
    market.sharePriceAfterX96 = positionLiquidated.sharePriceAfterX96
    market.timestamp = positionLiquidated.timestamp

    const trader = getOrCreateTrader(positionLiquidated.trader)
    pushMarket(trader.markets, positionLiquidated.market)
    trader.collateralBalance = trader.collateralBalance
        .plus(positionLiquidated.realizedPnl)
        .minus(positionLiquidated.liquidationPenalty!)
    trader.timestamp = positionLiquidated.timestamp

    const liquidator = getOrCreateTrader(positionLiquidated.liquidator!)
    pushMarket(liquidator.markets, positionLiquidated.market)
    liquidator.collateralBalance = liquidator.collateralBalance.plus(positionLiquidated.liquidationReward!)
    liquidator.timestamp = positionLiquidated.timestamp

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
    traderTakerInfo.timestamp = positionLiquidated.timestamp

    const daySummaryOfTrader = getOrCreateDaySummary(positionLiquidated.trader, positionLiquidated.timestamp)
    daySummaryOfTrader.realizedPnl = daySummaryOfTrader.realizedPnl
        .plus(positionLiquidated.realizedPnl)
        .minus(positionLiquidated.liquidationPenalty!)
    daySummaryOfTrader.timestamp = positionLiquidated.timestamp

    const daySummaryOfLiquidator = getOrCreateDaySummary(positionLiquidated.liquidator!, positionLiquidated.timestamp)
    daySummaryOfLiquidator.realizedPnl = daySummaryOfLiquidator.realizedPnl.plus(positionLiquidated.liquidationReward!)
    daySummaryOfLiquidator.timestamp = positionLiquidated.timestamp

    if (isWithinPeriod(positionLiquidated.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatioOfTrader = getOrCreateProfitRatio(
            positionLiquidated.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatioOfTrader.profit = profitRatioOfTrader.profit
            .plus(positionLiquidated.realizedPnl)
            .minus(positionLiquidated.liquidationPenalty!)
        profitRatioOfTrader.profitRatio =
            profitRatioOfTrader.deposit == BI_ZERO
                ? BI_ZERO
                : profitRatioOfTrader.profit.div(profitRatioOfTrader.deposit)
        profitRatioOfTrader.save()

        const profitRatioOfLiquidator = getOrCreateProfitRatio(
            positionLiquidated.liquidator!,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatioOfLiquidator.profit = profitRatioOfLiquidator.profit.plus(positionLiquidated.liquidationReward!)
        profitRatioOfLiquidator.profitRatio =
            profitRatioOfLiquidator.deposit == BI_ZERO
                ? BI_ZERO
                : profitRatioOfLiquidator.profit.div(profitRatioOfLiquidator.deposit)
        profitRatioOfLiquidator.save()
    }

    createPositionHistory(
        positionLiquidated.trader,
        positionLiquidated.market,
        positionLiquidated.timestamp,
        positionLiquidated.base,
        positionLiquidated.baseBalancePerShareX96,
        positionLiquidated.quote,
        positionLiquidated.realizedPnl.minus(positionLiquidated.liquidationPenalty!),
        positionLiquidated.protocolFee,
    )

    createCandle(
        positionLiquidated.market,
        positionLiquidated.timestamp,
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
    daySummaryOfTrader.save()
    daySummaryOfLiquidator.save()
}

export function handleLimitOrderCreatedExchange(event: LimitOrderCreatedExchangeEvent): void {
    const limitOrderCreated = new LimitOrderCreatedExchange(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    limitOrderCreated.exchange = event.address.toHexString()
    limitOrderCreated.blockNumberLogIndex = getBlockNumberLogIndex(event)
    limitOrderCreated.timestamp = event.block.timestamp
    limitOrderCreated.trader = event.params.trader.toHexString()
    limitOrderCreated.market = event.params.market.toHexString()
    limitOrderCreated.isBid = event.params.isBid
    limitOrderCreated.base = event.params.base
    limitOrderCreated.priceX96 = event.params.priceX96
    limitOrderCreated.limitOrderType = event.params.limitOrderType
    limitOrderCreated.orderId = event.params.orderId
    limitOrderCreated.baseTaker = event.params.baseTaker

    const order = getOrCreateOrder(
        limitOrderCreated.trader,
        limitOrderCreated.market,
        limitOrderCreated.isBid,
        limitOrderCreated.orderId,
    )
    order.priceX96 = limitOrderCreated.priceX96
    order.volume = limitOrderCreated.base.minus(limitOrderCreated.baseTaker)
    order.limitOrderType = limitOrderCreated.limitOrderType
    order.timestamp = limitOrderCreated.timestamp

    const orderBook = getOrCreateOrderBook(limitOrderCreated.market)
    if (limitOrderCreated.isBid) {
        addBidOrderRow(
            limitOrderCreated.market,
            limitOrderCreated.priceX96,
            limitOrderCreated.base.minus(limitOrderCreated.baseTaker),
            orderBook.id,
        )
    } else {
        addAskOrderRow(
            limitOrderCreated.market,
            limitOrderCreated.priceX96,
            limitOrderCreated.base.minus(limitOrderCreated.baseTaker),
            orderBook.id,
        )
    }
    orderBook.timestamp = limitOrderCreated.timestamp

    limitOrderCreated.save()
    order.save()
    orderBook.save()
}

export function handleLimitOrderCanceledExchange(event: LimitOrderCanceledExchangeEvent): void {
    const limitOrderCanceled = new LimitOrderCanceledExchange(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    limitOrderCanceled.exchange = event.address.toHexString()
    limitOrderCanceled.blockNumberLogIndex = getBlockNumberLogIndex(event)
    limitOrderCanceled.timestamp = event.block.timestamp
    limitOrderCanceled.trader = event.params.trader.toHexString()
    limitOrderCanceled.market = event.params.market.toHexString()
    limitOrderCanceled.liquidator = event.params.liquidator.toHexString()
    limitOrderCanceled.isBid = event.params.isBid
    limitOrderCanceled.orderId = event.params.orderId

    const order = getOrCreateOrder(
        limitOrderCanceled.trader,
        limitOrderCanceled.market,
        limitOrderCanceled.isBid,
        limitOrderCanceled.orderId,
    )

    const orderBook = getOrCreateOrderBook(limitOrderCanceled.market)
    if (limitOrderCanceled.isBid) {
        excludeBidOrderRow(order.market, order.priceX96, order.volume, orderBook.id)
    } else {
        excludeAskOrderRow(order.market, order.priceX96, order.volume, orderBook.id)
    }

    deleteOrder(
        limitOrderCanceled.trader,
        limitOrderCanceled.market,
        limitOrderCanceled.isBid,
        limitOrderCanceled.orderId,
    )

    limitOrderCanceled.save()
    orderBook.save()
}

export function handlePartiallyExecuted(event: PartiallyExecutedEvent): void {
    const partiallyExecuted = new PartiallyExecuted(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    partiallyExecuted.exchange = event.address.toHexString()
    partiallyExecuted.blockNumberLogIndex = getBlockNumberLogIndex(event)
    partiallyExecuted.timestamp = event.block.timestamp
    partiallyExecuted.maker = event.params.maker.toHexString()
    partiallyExecuted.market = event.params.market.toHexString()
    partiallyExecuted.isBid = event.params.isBid
    partiallyExecuted.basePartial = event.params.basePartial
    partiallyExecuted.quotePartial = event.params.quotePartial
    partiallyExecuted.partialRealizedPnl = event.params.partialRealizedPnl

    const trader = getOrCreateTrader(partiallyExecuted.maker)
    pushMarket(trader.markets, partiallyExecuted.market)
    trader.collateralBalance = trader.collateralBalance.plus(partiallyExecuted.partialRealizedPnl)
    trader.timestamp = partiallyExecuted.timestamp

    const market = getOrCreateMarket(partiallyExecuted.market)

    const traderTakerInfo = getOrCreateTraderTakerInfo(partiallyExecuted.maker, partiallyExecuted.market)
    if (partiallyExecuted.isBid) {
        traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(partiallyExecuted.basePartial)
        traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
            .minus(partiallyExecuted.quotePartial)
            .minus(partiallyExecuted.partialRealizedPnl)
    } else {
        traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.minus(partiallyExecuted.basePartial)
        traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance
            .plus(partiallyExecuted.quotePartial)
            .minus(partiallyExecuted.partialRealizedPnl)
    }
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare.times(market.baseBalancePerShareX96).div(Q96)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = partiallyExecuted.timestamp

    const daySummary = getOrCreateDaySummary(partiallyExecuted.maker, partiallyExecuted.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(partiallyExecuted.partialRealizedPnl)
    daySummary.timestamp = partiallyExecuted.timestamp

    if (isWithinPeriod(partiallyExecuted.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(partiallyExecuted.maker, competitionStartedAt, competitionFinishedAt)
        profitRatio.profit = profitRatio.profit.plus(partiallyExecuted.partialRealizedPnl)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    createPositionHistory(
        partiallyExecuted.maker,
        partiallyExecuted.market,
        partiallyExecuted.timestamp,
        partiallyExecuted.basePartial,
        market.baseBalancePerShareX96,
        partiallyExecuted.quotePartial,
        partiallyExecuted.partialRealizedPnl,
        BI_ZERO,
    )

    partiallyExecuted.save()
    trader.save()
    traderTakerInfo.save()
    daySummary.save()
}

export function handleLimitOrderSettled(event: LimitOrderSettledEvent): void {
    const limitOrderSettled = new LimitOrderSettled(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    limitOrderSettled.exchange = event.address.toHexString()
    limitOrderSettled.blockNumberLogIndex = getBlockNumberLogIndex(event)
    limitOrderSettled.timestamp = event.block.timestamp
    limitOrderSettled.trader = event.params.trader.toHexString()
    limitOrderSettled.market = event.params.market.toHexString()
    limitOrderSettled.base = event.params.base
    limitOrderSettled.quote = event.params.quote
    limitOrderSettled.realizedPnl = event.params.realizedPnl

    const trader = getOrCreateTrader(limitOrderSettled.trader)
    pushMarket(trader.markets, limitOrderSettled.market)
    trader.collateralBalance = trader.collateralBalance.plus(limitOrderSettled.realizedPnl)
    trader.timestamp = limitOrderSettled.timestamp

    const market = getOrCreateMarket(limitOrderSettled.market)

    const traderTakerInfo = getOrCreateTraderTakerInfo(limitOrderSettled.trader, limitOrderSettled.market)
    traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare.plus(limitOrderSettled.base)
    traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare.times(market.baseBalancePerShareX96).div(Q96)
    traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance.plus(limitOrderSettled.quote)
    traderTakerInfo.entryPrice =
        traderTakerInfo.baseBalance == BI_ZERO ? BI_ZERO : traderTakerInfo.quoteBalance.div(traderTakerInfo.baseBalance)
    traderTakerInfo.timestamp = limitOrderSettled.timestamp

    const daySummary = getOrCreateDaySummary(limitOrderSettled.trader, limitOrderSettled.timestamp)
    daySummary.realizedPnl = daySummary.realizedPnl.plus(limitOrderSettled.realizedPnl)
    daySummary.timestamp = limitOrderSettled.timestamp

    if (isWithinPeriod(limitOrderSettled.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(
            limitOrderSettled.trader,
            competitionStartedAt,
            competitionFinishedAt,
        )
        profitRatio.profit = profitRatio.profit.plus(limitOrderSettled.realizedPnl)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    limitOrderSettled.save()
    trader.save()
    traderTakerInfo.save()
    daySummary.save()
}

export function handleMarketClosed(event: MarketClosedEvent): void {
    const marketClosed = new MarketClosed(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    marketClosed.exchange = event.address.toHexString()
    marketClosed.blockNumberLogIndex = getBlockNumberLogIndex(event)
    marketClosed.timestamp = event.block.timestamp
    marketClosed.trader = event.params.trader.toHexString()
    marketClosed.market = event.params.market.toHexString()
    marketClosed.realizedPnl = event.params.realizedPnl

    const trader = getOrCreateTrader(marketClosed.trader)
    trader.collateralBalance = trader.collateralBalance.plus(marketClosed.realizedPnl)
    trader.timestamp = marketClosed.timestamp

    if (isWithinPeriod(marketClosed.timestamp, competitionStartedAt, competitionFinishedAt)) {
        const profitRatio = getOrCreateProfitRatio(marketClosed.trader, competitionStartedAt, competitionFinishedAt)
        profitRatio.profit = profitRatio.profit.plus(marketClosed.realizedPnl)
        profitRatio.profitRatio = profitRatio.deposit == BI_ZERO ? BI_ZERO : profitRatio.profit.div(profitRatio.deposit)
        profitRatio.save()
    }

    marketClosed.save()
    trader.save()
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
    protocol.timestamp = maxMarketsPerAccountChanged.timestamp

    maxMarketsPerAccountChanged.save()
    protocol.save()
}

export function handleMaxOrdersPerAccountChanged(event: MaxOrdersPerAccountChangedEvent): void {
    const maxOrdersPerAccountChanged = new MaxOrdersPerAccountChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    maxOrdersPerAccountChanged.exchange = event.address.toHexString()
    maxOrdersPerAccountChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    maxOrdersPerAccountChanged.timestamp = event.block.timestamp
    maxOrdersPerAccountChanged.value = event.params.value

    const protocol = getOrCreateProtocol()
    protocol.maxOrdersPerAccount = maxOrdersPerAccountChanged.value
    protocol.timestamp = maxOrdersPerAccountChanged.timestamp

    maxOrdersPerAccountChanged.save()
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
    protocol.timestamp = imRatioChanged.timestamp

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
    protocol.timestamp = mmRatioChanged.timestamp

    mmRatioChanged.save()
    protocol.save()
}

export function handleLiquidationRewardConfigChanged(event: LiquidationRewardConfigChangedEvent): void {
    const liquidationRewardConfigChanged = new LiquidationRewardConfigChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    liquidationRewardConfigChanged.exchange = event.address.toHexString()
    liquidationRewardConfigChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    liquidationRewardConfigChanged.timestamp = event.block.timestamp
    liquidationRewardConfigChanged.rewardRatio = event.params.rewardRatio
    liquidationRewardConfigChanged.smoothEmaTime = event.params.smoothEmaTime

    const protocol = getOrCreateProtocol()
    protocol.rewardRatio = liquidationRewardConfigChanged.rewardRatio
    protocol.smoothEmaTime = liquidationRewardConfigChanged.smoothEmaTime
    protocol.timestamp = liquidationRewardConfigChanged.timestamp

    liquidationRewardConfigChanged.save()
    protocol.save()
}

export function handleProtocolFeeRatioChanged(event: ProtocolFeeRatioChangedEvent): void {
    const protocolFeeRatioChanged = new ProtocolFeeRatioChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    protocolFeeRatioChanged.exchange = event.address.toHexString()
    protocolFeeRatioChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    protocolFeeRatioChanged.timestamp = event.block.timestamp
    protocolFeeRatioChanged.value = event.params.value

    const protocol = getOrCreateProtocol()
    protocol.protocolFeeRatio = protocolFeeRatioChanged.value
    protocol.timestamp = protocolFeeRatioChanged.timestamp

    protocolFeeRatioChanged.save()
    protocol.save()
}

export function handleMarketStatusChanged(event: MarketStatusChangedEvent): void {
    const marketStatusChanged = new MarketStatusChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    marketStatusChanged.exchange = event.address.toHexString()
    marketStatusChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    marketStatusChanged.timestamp = event.block.timestamp
    marketStatusChanged.market = event.params.market.toHexString()
    marketStatusChanged.status = event.params.status

    const market = getOrCreateMarket(marketStatusChanged.market)
    market.timestamp = marketStatusChanged.timestamp
    market.status = marketStatusChanged.status

    PerpdexMarket.create(event.params.market)

    marketStatusChanged.save()
    market.save()
}
