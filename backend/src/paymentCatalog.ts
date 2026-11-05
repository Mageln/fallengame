// Server-owned catalogue. A listed product is not evidence of payment.
// Keep sales disabled until VK notifications and atomic fulfillment are implemented.
export const paymentProducts = [
  { id: 'caps_550', name: '550 крышек', currency: 'caps', amount: 550, priceVotes: 100, available: false },
] as const;
