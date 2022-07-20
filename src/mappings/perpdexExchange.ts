import { Deposited as DepositedEvent } from "../../generated/PerpdexExchange/PerpdexExchange"
import { Deposited } from "../../generated/schema"
import { getBlockNumberLogIndex, getOrCreateProtocol, getOrCreateTrader } from "../utils/stores"

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
