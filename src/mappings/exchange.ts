import { BigDecimal } from "@graphprotocol/graph-ts"
import { FundingUpdated as FundingUpdatedEvent } from "../../generated/ExchangePerpdex/ExchangePerpdex"
import { FundingUpdated } from "../../generated/schema"
import { fromWei } from "../utils/numbers"
import { getBlockNumberLogIndex } from "../utils/stores"

export function handleFundingUpdated(event: FundingUpdatedEvent): void {
    // insert FundingUpdated
    const fundingUpdated = new FundingUpdated(`${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`)
    fundingUpdated.blockNumberLogIndex = getBlockNumberLogIndex(event)
    fundingUpdated.blockNumber = event.block.number
    fundingUpdated.timestamp = event.block.timestamp
    fundingUpdated.txHash = event.transaction.hash
    fundingUpdated.baseToken = event.params.baseToken
    fundingUpdated.markTwap = fromWei(event.params.markTwap)
    fundingUpdated.indexTwap = fromWei(event.params.indexTwap)
    // daily funding rate = (markTwap - indexTwap) / indexTwap
    const markMinusIndex = fundingUpdated.markTwap.minus(fundingUpdated.indexTwap)
    if (markMinusIndex != BigDecimal.zero()) {
        fundingUpdated.dailyFundingRate = markMinusIndex.div(fundingUpdated.indexTwap)
    } else {
        fundingUpdated.dailyFundingRate = BigDecimal.zero()
    }

    // commit changes
    fundingUpdated.save()
}
