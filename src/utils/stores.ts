import { BigInt, ethereum, store } from "@graphprotocol/graph-ts"
import {
    AskOrderRow,
    BidOrderRow,
    Candle,
    DaySummary,
    LiquidityHistory,
    Market,
    Order,
    OrderBook,
    PositionHistory,
    ProfitRatio,
    Protocol,
    Trader,
    TraderMakerInfo,
    TraderTakerInfo,
} from "../../generated/schema"
import { ChainId, Network, Version } from "../constants"
import { ask, bid, BI_ZERO, d1, h1, m15, m5, MAX_LOG_COUNT, Q96, STR_ZERO } from "./constants"

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

export function getOrCreateTraderTakerInfo(traderAddr: string, marketAddr: string): TraderTakerInfo {
    let traderTakerInfo = TraderTakerInfo.load(`${traderAddr}-${marketAddr}`)
    if (!traderTakerInfo) {
        traderTakerInfo = new TraderTakerInfo(`${traderAddr}-${marketAddr}`)
        traderTakerInfo.trader = traderAddr
        traderTakerInfo.market = marketAddr
        traderTakerInfo.baseBalanceShare = BI_ZERO
        traderTakerInfo.baseBalance = BI_ZERO
        traderTakerInfo.quoteBalance = BI_ZERO
        traderTakerInfo.entryPrice = BI_ZERO
        traderTakerInfo.timestamp = BI_ZERO
        traderTakerInfo.save()
    }
    return traderTakerInfo
}

export function getOrCreateTraderMakerInfo(traderAddr: string, marketAddr: string): TraderMakerInfo {
    let traderMakerInfo = TraderMakerInfo.load(`${traderAddr}-${marketAddr}`)
    if (!traderMakerInfo) {
        traderMakerInfo = new TraderMakerInfo(`${traderAddr}-${marketAddr}`)
        traderMakerInfo.trader = traderAddr
        traderMakerInfo.market = marketAddr
        traderMakerInfo.liquidity = BI_ZERO
        traderMakerInfo.cumBaseSharePerLiquidityX96 = BI_ZERO
        traderMakerInfo.cumQuotePerLiquidityX96 = BI_ZERO
        traderMakerInfo.timestamp = BI_ZERO
        traderMakerInfo.save()
    }
    return traderMakerInfo
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
        protocol.maxOrdersPerAccount = 0
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

export function getOrCreateMarket(marketAddr: string): Market {
    let market = Market.load(marketAddr)
    if (!market) {
        market = new Market(marketAddr)
        market.baseToken = STR_ZERO
        market.quoteToken = STR_ZERO
        market.baseAmount = BI_ZERO
        market.quoteAmount = BI_ZERO
        market.liquidity = BI_ZERO
        market.takerVolume = BI_ZERO
        market.makerVolume = BI_ZERO
        market.baseBalancePerShareX96 = BI_ZERO
        market.sharePriceAfterX96 = BI_ZERO
        market.cumBasePerLiquidityX96 = BI_ZERO
        market.cumQuotePerLiquidityX96 = BI_ZERO
        market.poolFeeRatio = 0
        market.fundingMaxPremiumRatio = 0
        market.fundingMaxElapsedSec = BI_ZERO
        market.fundingRolloverSec = BI_ZERO
        market.normalOrderRatio = 0
        market.liquidationRatio = 0
        market.emaNormalOrderRatio = 0
        market.emaLiquidationRatio = 0
        market.emaSec = BI_ZERO
        market.fixedFeeRatio = 0
        market.atrFeeRatio = 0
        market.atrEmaBlocks = BI_ZERO
        market.status = 0

        market.timestampAdded = BI_ZERO
        market.timestamp = BI_ZERO
        market.save()
    }
    return market
}

export function getOrCreateDaySummary(traderAddr: string, timestamp: BigInt): DaySummary {
    const dayID = Math.floor(timestamp.toI32() / (24 * 60 * 60)) as i32
    let daySummary = DaySummary.load(`${traderAddr}-${dayID}`)
    if (!daySummary) {
        daySummary = new DaySummary(`${traderAddr}-${dayID}`)
        daySummary.trader = traderAddr
        daySummary.dayID = dayID
        daySummary.timestamp = timestamp
        daySummary.realizedPnl = BI_ZERO
        daySummary.timestamp = BI_ZERO
        daySummary.save()
    }
    return daySummary
}

export function createPositionHistory(
    traderAddr: string,
    marketAddr: string,
    timestamp: BigInt,
    base: BigInt,
    baseBalancePerShareX96: BigInt,
    quote: BigInt,
    realizedPnl: BigInt,
    protocolFee: BigInt,
): void {
    let positionHistory = PositionHistory.load(`${traderAddr}-${marketAddr}-${timestamp}`)
    if (!positionHistory) {
        positionHistory = new PositionHistory(`${traderAddr}-${marketAddr}-${timestamp}`)
        positionHistory.trader = traderAddr
        positionHistory.market = marketAddr
        positionHistory.timestamp = timestamp
        positionHistory.baseBalanceShare = BI_ZERO
        positionHistory.baseBalancePerShareX96 = BI_ZERO
        positionHistory.baseBalance = BI_ZERO
        positionHistory.quoteBalance = BI_ZERO
        positionHistory.entryPrice = BI_ZERO
        positionHistory.realizedPnl = BI_ZERO
        positionHistory.protocolFee = BI_ZERO
    }
    positionHistory.baseBalanceShare = positionHistory.baseBalanceShare.plus(base)
    positionHistory.baseBalancePerShareX96 = baseBalancePerShareX96
    positionHistory.baseBalance = positionHistory.baseBalanceShare
        .times(positionHistory.baseBalancePerShareX96)
        .div(Q96)
    positionHistory.quoteBalance = positionHistory.quoteBalance.plus(quote)
    positionHistory.entryPrice =
        positionHistory.baseBalance == BI_ZERO ? BI_ZERO : positionHistory.quoteBalance.div(positionHistory.baseBalance)
    positionHistory.realizedPnl = positionHistory.realizedPnl.plus(realizedPnl)
    positionHistory.protocolFee = protocolFee
    positionHistory.save()
}

export function createLiquidityHistory(
    traderAddr: string,
    marketAddr: string,
    timestamp: BigInt,
    base: BigInt,
    quote: BigInt,
    liquidity: BigInt,
): void {
    let liquidityHistory = LiquidityHistory.load(`${traderAddr}-${marketAddr}-${timestamp}`)
    if (!liquidityHistory) {
        liquidityHistory = new LiquidityHistory(`${traderAddr}-${marketAddr}-${timestamp}`)
        liquidityHistory.trader = traderAddr
        liquidityHistory.market = marketAddr
        liquidityHistory.timestamp = timestamp
        liquidityHistory.base = BI_ZERO
        liquidityHistory.quote = BI_ZERO
        liquidityHistory.liquidity = BI_ZERO
    }
    liquidityHistory.base = liquidityHistory.base.plus(base)
    liquidityHistory.quote = liquidityHistory.quote.plus(quote)
    liquidityHistory.liquidity = liquidityHistory.liquidity.plus(liquidity)
    liquidityHistory.save()
}

function doCreateCandle(
    marketAddr: string,
    time: BigInt,
    timeFormat: number,
    priceX96: BigInt,
    baseAmount: BigInt,
    quoteAmount: BigInt,
): void {
    let ohlc = Candle.load(`${marketAddr}-${timeFormat}-${time}`)
    if (!ohlc) {
        ohlc = new Candle(`${marketAddr}-${timeFormat}-${time}`)
        ohlc.market = marketAddr
        ohlc.timeFormat = timeFormat as i32
        ohlc.timestamp = time
        ohlc.openX96 = priceX96
        ohlc.highX96 = priceX96
        ohlc.lowX96 = priceX96
        ohlc.baseAmount = BI_ZERO
        ohlc.quoteAmount = BI_ZERO
    }
    if (ohlc.highX96 < priceX96) {
        ohlc.highX96 = priceX96
    } else if (ohlc.lowX96 > priceX96) {
        ohlc.lowX96 = priceX96
    }
    ohlc.closeX96 = priceX96
    ohlc.baseAmount = ohlc.baseAmount.plus(baseAmount.abs())
    ohlc.quoteAmount = ohlc.quoteAmount.plus(quoteAmount.abs())
    ohlc.updatedAt = time
    ohlc.save()
}

function roundTime(time: BigInt, interval: number): BigInt {
    const roundTime = (Math.floor(time.toI32() / interval) * interval) as i64
    return BigInt.fromI64(roundTime)
}

export function createCandle(
    marketAddr: string,
    time: BigInt,
    sharePriceX96: BigInt,
    baseBalancePerShareX96: BigInt,
    baseShare: BigInt,
    quoteAmount: BigInt,
): void {
    const intervals = [m5, m15, h1, d1]
    const priceX96 = baseBalancePerShareX96 == BI_ZERO ? BI_ZERO : sharePriceX96.times(Q96).div(baseBalancePerShareX96)

    for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i]
        doCreateCandle(
            marketAddr,
            roundTime(time, interval),
            interval,
            priceX96,
            baseShare.times(baseBalancePerShareX96).div(Q96),
            quoteAmount,
        )
    }
}

export function getOrCreateOrder(traderAddr: string, marketAddr: string, isBid: boolean, orderId: BigInt): Order {
    const way = isBid ? bid : ask
    let order = Order.load(`${traderAddr}-${marketAddr}-${way}-${orderId}`)
    if (!order) {
        order = new Order(`${traderAddr}-${marketAddr}-${way}-${orderId}`)
        order.trader = traderAddr
        order.market = marketAddr
        order.way = way
        order.orderId = orderId
        order.priceX96 = BI_ZERO
        order.volume = BI_ZERO
        order.limitOrderType = 0
        order.timestamp = BI_ZERO
    }
    order.save()
    return order
}

export function deleteOrder(traderAddr: string, marketAddr: string, isBid: boolean, orderId: BigInt): void {
    const way = isBid ? bid : ask
    store.remove("Order", `${traderAddr}-${marketAddr}-${way}-${orderId}`)
}

export function getOrCreateOrderBook(marketAddr: string): OrderBook {
    let orderBook = OrderBook.load(`OrderBook:${marketAddr}`)
    if (!orderBook) {
        orderBook = new OrderBook(`OrderBook:${marketAddr}`)
        orderBook.market = marketAddr
        orderBook.timestamp = BI_ZERO
    }
    orderBook.save()
    return orderBook
}

export function addBidOrderRow(marketAddr: string, priceX96: BigInt, volume: BigInt, orderBookID: string): void {
    let bidOrderRow = BidOrderRow.load(`${marketAddr}-bid-${priceX96}`)
    if (!bidOrderRow) {
        bidOrderRow = new BidOrderRow(`${marketAddr}-bid-${priceX96}`)
        bidOrderRow.priceX96 = priceX96
        bidOrderRow.volume = BI_ZERO
    }
    bidOrderRow.volume = bidOrderRow.volume.plus(volume)
    bidOrderRow.orderBook = orderBookID
    bidOrderRow.save()
}

export function excludeBidOrderRow(marketAddr: string, priceX96: BigInt, volume: BigInt, orderBookID: string): void {
    let bidOrderRow = BidOrderRow.load(`${marketAddr}-bid-${priceX96}`)
    if (!bidOrderRow) {
        bidOrderRow = new BidOrderRow(`${marketAddr}-bid-${priceX96}`)
        bidOrderRow.priceX96 = priceX96
        bidOrderRow.volume = BI_ZERO
    }
    bidOrderRow.volume = bidOrderRow.volume.minus(volume)
    bidOrderRow.orderBook = orderBookID
    bidOrderRow.save()
}

export function addAskOrderRow(marketAddr: string, priceX96: BigInt, volume: BigInt, orderBookID: string): void {
    let askOrderRow = AskOrderRow.load(`${marketAddr}-ask-${priceX96}`)
    if (!askOrderRow) {
        askOrderRow = new AskOrderRow(`${marketAddr}-ask-${priceX96}`)
        askOrderRow.priceX96 = priceX96
        askOrderRow.volume = BI_ZERO
    }
    askOrderRow.volume = askOrderRow.volume.plus(volume)
    askOrderRow.orderBook = orderBookID
    askOrderRow.save()
}

export function excludeAskOrderRow(marketAddr: string, priceX96: BigInt, volume: BigInt, orderBookID: string): void {
    let askOrderRow = AskOrderRow.load(`${marketAddr}-ask-${priceX96}`)
    if (!askOrderRow) {
        askOrderRow = new AskOrderRow(`${marketAddr}-ask-${priceX96}`)
        askOrderRow.priceX96 = priceX96
        askOrderRow.volume = BI_ZERO
    }
    askOrderRow.volume = askOrderRow.volume.minus(volume)
    askOrderRow.orderBook = orderBookID
    askOrderRow.save()
}

export function getOrCreateProfitRatio(traderAddr: string, startedAt: number, finishedAt: number): ProfitRatio {
    let profitRatio = ProfitRatio.load(`${traderAddr}-${startedAt}-${finishedAt}`)
    if (!profitRatio) {
        profitRatio = new ProfitRatio(`${traderAddr}-${startedAt}-${finishedAt}`)
        profitRatio.trader = traderAddr
        profitRatio.startedAt = startedAt as i32
        profitRatio.finishedAt = finishedAt as i32
        profitRatio.profitRatio = BI_ZERO
        profitRatio.profit = BI_ZERO
        profitRatio.deposit = BI_ZERO
    }
    profitRatio.save()
    return profitRatio
}
