import { BigInt } from "@graphprotocol/graph-ts"
import {
    FundingMaxElapsedSecChanged,
    FundingMaxPremiumRatioChanged,
    FundingPaid,
    FundingRolloverSecChanged,
    LiquidityAddedMarket,
    LiquidityRemovedMarket,
    PoolFeeRatioChanged,
    PriceLimitConfigChanged,
    Swapped,
} from "../../generated/schema"
import {
    FundingMaxElapsedSecChanged as FundingMaxElapsedSecChangedEvent,
    FundingMaxPremiumRatioChanged as FundingMaxPremiumRatioChangedEvent,
    FundingPaid as FundingPaidEvent,
    FundingRolloverSecChanged as FundingRolloverSecChangedEvent,
    LiquidityAdded as LiquidityAddedEvent,
    LiquidityRemoved as LiquidityRemovedEvent,
    PoolFeeRatioChanged as PoolFeeRatioChangedEvent,
    PriceLimitConfigChanged as PriceLimitConfigChangedEvent,
    Swapped as SwappedEvent,
} from "../../generated/templates/PerpdexMarket/PerpdexMarket"
import { BI_ZERO, Q96 } from "../utils/constants"
import { getBlockNumberLogIndex, getOrCreateMarket, getOrCreateProtocol } from "../utils/stores"

export function handleFundingPaid(event: FundingPaidEvent): void {
    const fundingPaid = new FundingPaid(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    fundingPaid.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingPaid.timestamp = event.block.timestamp
    fundingPaid.fundingRateX96 = event.params.fundingRateX96
    fundingPaid.elapsedSec = event.params.elapsedSec
    fundingPaid.premiumX96 = event.params.premiumX96
    fundingPaid.markPriceX96 = event.params.markPriceX96
    fundingPaid.cumBasePerLiquidityX96 = event.params.cumBasePerLiquidityX96
    fundingPaid.cumQuotePerLiquidityX96 = event.params.cumQuotePerLiquidityX96

    const market = getOrCreateMarket(event.address.toHexString())
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
    liquidityAdded.base = event.params.base
    liquidityAdded.quote = event.params.quote
    liquidityAdded.liquidity = event.params.liquidity

    const protocol = getOrCreateProtocol()
    protocol.makerVolume = protocol.makerVolume.plus(liquidityAdded.liquidity)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(event.address.toHexString())
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

export function handleLiquidityRemoved(event: LiquidityRemovedEvent): void {
    const liquidityRemoved = new LiquidityRemovedMarket(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    liquidityRemoved.blockNumberLogIndex = getBlockNumberLogIndex(event)
    liquidityRemoved.timestamp = event.block.timestamp
    liquidityRemoved.base = event.params.base
    liquidityRemoved.quote = event.params.quote
    liquidityRemoved.liquidity = event.params.liquidity

    const protocol = getOrCreateProtocol()
    protocol.makerVolume = protocol.makerVolume.plus(liquidityRemoved.liquidity)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(event.address.toHexString())
    market.baseAmount = market.baseAmount.minus(liquidityRemoved.base)
    market.quoteAmount = market.quoteAmount.minus(liquidityRemoved.quote)
    market.liquidity = market.liquidity.minus(liquidityRemoved.liquidity)
    market.makerVolume = market.makerVolume.plus(liquidityRemoved.liquidity)
    market.timestampAdded = event.block.timestamp
    market.timestamp = event.block.timestamp

    liquidityRemoved.save()
    protocol.save()
    market.save()
}

export function handleSwapped(event: SwappedEvent): void {
    const swapped = new Swapped(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    swapped.blockNumberLogIndex = getBlockNumberLogIndex(event)
    swapped.timestamp = event.block.timestamp
    swapped.isBaseToQuote = event.params.isBaseToQuote
    swapped.isExactInput = event.params.isExactInput
    swapped.amount = event.params.amount
    swapped.oppositeAmount = event.params.oppositeAmount

    const protocol = getOrCreateProtocol()
    protocol.takerVolume = protocol.takerVolume.plus(swapped.amount)
    protocol.timestamp = event.block.timestamp

    const market = getOrCreateMarket(event.address.toHexString())
    if (swapped.isExactInput) {
        if (swapped.isBaseToQuote) {
            market.baseAmount = market.baseAmount.plus(swapped.amount)
            market.quoteAmount = market.quoteAmount.minus(swapped.oppositeAmount)
        } else {
            market.baseAmount = market.baseAmount.minus(swapped.oppositeAmount)
            market.quoteAmount = market.quoteAmount.plus(swapped.amount)
        }
    } else {
        if (swapped.isBaseToQuote) {
            market.baseAmount = market.baseAmount.plus(swapped.oppositeAmount)
            market.quoteAmount = market.quoteAmount.minus(swapped.amount)
        } else {
            market.baseAmount = market.baseAmount.minus(swapped.amount)
            market.quoteAmount = market.quoteAmount.plus(swapped.oppositeAmount)
        }
    }
    market.takerVolume = market.takerVolume.plus(swapped.amount)
    market.timestamp = event.block.timestamp

    swapped.save()
    protocol.save()
    market.save()
}

export function handlePoolFeeRatioChanged(event: PoolFeeRatioChangedEvent): void {
    const poolFeeRatioChanged = new PoolFeeRatioChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    poolFeeRatioChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    poolFeeRatioChanged.timestamp = event.block.timestamp
    poolFeeRatioChanged.value = event.params.value

    const market = getOrCreateMarket(event.address.toHexString())
    market.poolFeeRatio = poolFeeRatioChanged.value
    market.timestamp = event.block.timestamp

    poolFeeRatioChanged.save()
    market.save()
}

export function handleFundingMaxPremiumRatioChanged(event: FundingMaxPremiumRatioChangedEvent): void {
    const fundingMaxPremiumRatioChanged = new FundingMaxPremiumRatioChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    fundingMaxPremiumRatioChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingMaxPremiumRatioChanged.timestamp = event.block.timestamp
    fundingMaxPremiumRatioChanged.value = event.params.value

    const market = getOrCreateMarket(event.address.toHexString())
    market.maxPremiumRatio = fundingMaxPremiumRatioChanged.value
    market.timestamp = event.block.timestamp

    fundingMaxPremiumRatioChanged.save()
    market.save()
}

export function handleFundingMaxElapsedSecChanged(event: FundingMaxElapsedSecChangedEvent): void {
    const fundingMaxElapsedSecChanged = new FundingMaxElapsedSecChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    fundingMaxElapsedSecChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingMaxElapsedSecChanged.timestamp = event.block.timestamp
    fundingMaxElapsedSecChanged.value = event.params.value

    const market = getOrCreateMarket(event.address.toHexString())
    market.fundingMaxElapsedSec = fundingMaxElapsedSecChanged.value
    market.timestamp = event.block.timestamp

    fundingMaxElapsedSecChanged.save()
    market.save()
}

export function handleFundingRolloverSecChanged(event: FundingRolloverSecChangedEvent): void {
    const fundingRolloverSecChanged = new FundingRolloverSecChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    fundingRolloverSecChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingRolloverSecChanged.timestamp = event.block.timestamp
    fundingRolloverSecChanged.value = event.params.value

    const market = getOrCreateMarket(event.address.toHexString())
    market.fundingRolloverSec = fundingRolloverSecChanged.value
    market.timestamp = event.block.timestamp

    fundingRolloverSecChanged.save()
    market.save()
}

export function handlePriceLimitConfigChanged(event: PriceLimitConfigChangedEvent): void {
    const priceLimitConfigChanged = new PriceLimitConfigChanged(
        `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`,
    )
    priceLimitConfigChanged.blockNumberLogIndex = getBlockNumberLogIndex(event)
    priceLimitConfigChanged.timestamp = event.block.timestamp
    priceLimitConfigChanged.normalOrderRatio = event.params.normalOrderRatio
    priceLimitConfigChanged.liquidationRatio = event.params.liquidationRatio
    priceLimitConfigChanged.emaNormalOrderRatio = event.params.emaNormalOrderRatio
    priceLimitConfigChanged.emaLiquidationRatio = event.params.emaLiquidationRatio
    priceLimitConfigChanged.emaSec = event.params.emaSec

    const market = getOrCreateMarket(event.address.toHexString())
    market.normalOrderRatio = priceLimitConfigChanged.normalOrderRatio
    market.liquidationRatio = priceLimitConfigChanged.liquidationRatio
    market.emaNormalOrderRatio = priceLimitConfigChanged.emaNormalOrderRatio
    market.emaLiquidationRatio = priceLimitConfigChanged.emaLiquidationRatio
    market.emaSec = priceLimitConfigChanged.emaSec
    market.timestamp = event.block.timestamp

    priceLimitConfigChanged.save()
    market.save()
}