export const getPlatformFee = (platform) => {
  switch (platform) {
    case 'csfloat':
      return 0.02;
    case 'csmoney':
    case 'gamerpay':
    case 'skinswap':
    case 'dmarket':
    case 'tradeit':
      return 0.05;
    case 'facebook':
      return 0;
    case 'youpin':
      return 0.005;
    default:
      return 0.005;
  }
};