import { z } from "zod";

/**
 * Payment method enums — two distinct contracts (design D4):
 * sales accept CASH/MP_TRANSFER/MP_POSNET; purchases accept CASH/TRANSFER.
 * A purchase must not accept `mp_posnet`.
 */
export const paymentMethodSchema = z.enum(["CASH", "MP_TRANSFER", "MP_POSNET"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const purchasePaymentMethodSchema = z.enum(["CASH", "TRANSFER"]);
export type PurchasePaymentMethod = z.infer<typeof purchasePaymentMethodSchema>;