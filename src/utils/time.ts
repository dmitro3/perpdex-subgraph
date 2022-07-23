export function getUnixtime(event): number {
  return Math.floor(event.blockTimestamp.getTime() / 1000);
}
