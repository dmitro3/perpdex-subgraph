import { BigInt } from "@graphprotocol/graph-ts"
import { FundingPaid, LiquidityAddedMarket } from "../../generated/schema"
import {
    FundingPaid as FundingPaidEvent,
    LiquidityAdded as LiquidityAddedEvent,
} from "../../generated/templates/PerpdexMarket/PerpdexMarket"
import { BI_ZERO, Q96 } from "../utils/constants"
import { getBlockNumberLogIndex, getOrCreateMarket, getOrCreateProtocol } from "../utils/stores"

export function handleFundingPaid(event: FundingPaidEvent): void {
    const fundingPaid = new FundingPaid(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    fundingPaid.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingPaid.timestamp = event.block.timestamp
    fundingPaid.market = event.address.toHexString()
    fundingPaid.fundingRateX96 = event.params.fundingRateX96
    fundingPaid.elapsedSec = event.params.elapsedSec
    fundingPaid.premiumX96 = event.params.premiumX96
    fundingPaid.markPriceX96 = event.params.markPriceX96
    fundingPaid.cumBasePerLiquidityX96 = event.params.cumBasePerLiquidityX96
    fundingPaid.cumQuotePerLiquidityX96 = event.params.cumQuotePerLiquidityX96

    const market = getOrCreateMarket(fundingPaid.market)
    market.baseBalancePerShareX96 = market.baseBalancePerShareX96.times(Q96.minus(fundingPaid.fundingRateX96)).div(Q96)
    if (fundingPaid.fundingRateX96.gt(BigInt.fromI32(0))) {
        const deleveratedQuote = market.quoteAmount.times(fundingPaid.fundingRateX96).div(Q96)
        market.quoteAmount = market.quoteAmount.minus(deleveratedQuote)
        market.cumQuotePerLiquidityX96 = market.cumQuotePerLiquidityX96.plus(
            market.liquidity == BI_ZERO ? BI_ZERO : deleveratedQuote.times(Q96).div(market.liquidity),
        )
    } else {
        const deleveratedBase = market.baseAmount
            .times(fundingPaid.fundingRateX96.abs())
            .div(Q96.plus(fundingPaid.fundingRateX96.abs()))
        market.baseAmount = market.baseAmount.minus(deleveratedBase)
        market.cumBasePerLiquidityX96 = market.cumBasePerLiquidityX96.plus(
            market.liquidity == BI_ZERO ? BI_ZERO : deleveratedBase.times(Q96).div(market.liquidity),
        )
    }
    market.cumBasePerLiquidityX96 = fundingPaid.cumBasePerLiquidityX96
    market.cumQuotePerLiquidityX96 = fundingPaid.cumQuotePerLiquidityX96
    market.timestamp = event.block.timestamp

    fundingPaid.save()
    market.save()
}

export function handleLiquidityAdded(event: LiquidityAddedEvent): void {
    const liquidityAdded = new LiquidityAddedMarket(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    liquidityAdded.blockNumberLogIndex = getBlockNumberLogIndex(event)
    liquidityAdded.timestamp = event.block.timestamp
    liquidityAdded.market = event.address.toHexString()
    liquidityAdded.base = event.params.base
    liquidityAdded.quote = event.params.quote
    liquidityAdded.liquidity = event.params.liquidity

    const protocol = getOrCreateProtocol()
    protocol.makerVolume = protocol.makerVolume.plus(liquidityAdded.liquidity)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(liquidityAdded.market)
    market.baseAmount = market.baseAmount.plus(liquidityAdded.base)
    market.quoteAmount = market.quoteAmount.plus(liquidityAdded.quote)
    market.liquidity = market.liquidity.plus(liquidityAdded.liquidity)
    market.makerVolume = market.makerVolume.plus(liquidityAdded.liquidity)
    market.timestampAdded = event.block.timestamp
    market.timestamp = event.block.timestamp

    liquidityAdded.save()
    protocol.save()
    market.save()
}
