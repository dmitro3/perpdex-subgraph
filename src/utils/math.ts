// wip
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

export function negBI(bi: bigint): bigint {
  return BigInt(-1) * bi;
}

export function abs(a: bigint): bigint {
  return a > 0 ? a : -a;
}
