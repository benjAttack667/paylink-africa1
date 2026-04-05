import { env } from "../../config/env.js";
import { createFlutterwaveGateway } from "./providers/flutterwave.gateway.js";
import { createMockGateway } from "./providers/mock.gateway.js";

let gateway;

export function getPaymentGateway() {
  if (gateway) {
    return gateway;
  }

  if (env.paymentGateway === "FLUTTERWAVE") {
    gateway = createFlutterwaveGateway();
    return gateway;
  }

  gateway = createMockGateway();
  return gateway;
}
