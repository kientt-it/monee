export type HuiInput = {
  shares: number;
  paidOutShares: number;
  faceValue: number;
  startingContribution: number;
  bid: number;
  organizerFee: number;
};

export type HuiResult = {
  livingShares: number;
  otherLivingShares: number;
  paidOutContributions: number;
  otherLivingContributions: number;
  grossPool: number;
  cashReceived: number;
  remainingPeriods: number;
  remainingContributions: number;
  discountPerLivingShare: number;
};

export function calculateHui(input: HuiInput): HuiResult | null {
  const { shares, paidOutShares, faceValue, startingContribution, bid, organizerFee } = input;
  if (!Number.isSafeInteger(shares) || shares < 2 || shares > 1000
    || !Number.isSafeInteger(paidOutShares) || paidOutShares < 0 || paidOutShares >= shares
    || !Number.isSafeInteger(faceValue) || faceValue < 1 || faceValue > 1_000_000_000_000
    || !Number.isSafeInteger(startingContribution) || startingContribution < 1 || startingContribution > faceValue
    || !Number.isSafeInteger(bid) || bid < 1 || bid > startingContribution
    || !Number.isSafeInteger(organizerFee) || organizerFee < 0 || organizerFee > 1_000_000_000_000) return null;

  const livingShares = shares - paidOutShares;
  const otherLivingShares = livingShares - 1;
  const paidOutContributions = paidOutShares * faceValue;
  const otherLivingContributions = otherLivingShares * bid;
  const grossPool = paidOutContributions + livingShares * bid;
  const cashReceived = paidOutContributions + otherLivingContributions - organizerFee;
  if (cashReceived < 0 || !Number.isSafeInteger(grossPool)) return null;

  const remainingPeriods = livingShares - 1;
  return {
    livingShares,
    otherLivingShares,
    paidOutContributions,
    otherLivingContributions,
    grossPool,
    cashReceived,
    remainingPeriods,
    remainingContributions: remainingPeriods * faceValue,
    discountPerLivingShare: faceValue - bid,
  };
}
