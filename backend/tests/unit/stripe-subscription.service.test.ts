import { jest } from "@jest/globals";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";
process.env.ENCRYPTION_KEY ??= "test-encryption-key-please-ignore";
process.env.PUBLIC_WEB_URL ??= "http://localhost:5173";

const mockIsConfigured = jest.fn();
const mockCreateCustomer = jest.fn();
const mockCreateSubscriptionCheckoutSession = jest.fn();
const mockListActiveSubscriptions = jest.fn();
const mockCancelSubscription = jest.fn();
const mockConstructWebhookEvent = jest.fn();

jest.unstable_mockModule("../../src/integrations/stripe.client.js", () => ({
  isStripeSubscriptionsConfigured: mockIsConfigured,
  createCustomer: mockCreateCustomer,
  createSubscriptionCheckoutSession: mockCreateSubscriptionCheckoutSession,
  listActiveSubscriptions: mockListActiveSubscriptions,
  cancelSubscription: mockCancelSubscription,
  constructWebhookEvent: mockConstructWebhookEvent
}));

const mockFindUserById = jest.fn();
const mockFindUserByStripeCustomerId = jest.fn();
const mockUpdateUserPremiumStatus = jest.fn();
const mockUpdateUserStripeCustomerId = jest.fn();

jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findUserById: mockFindUserById,
  findUserByStripeCustomerId: mockFindUserByStripeCustomerId,
  updateUserPremiumStatus: mockUpdateUserPremiumStatus,
  updateUserStripeCustomerId: mockUpdateUserStripeCustomerId
}));

const { createCheckoutSession, cancelSubscription, handleSubscriptionWebhookEvent } = await import(
  "../../src/services/stripe-subscription.service.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateUserPremiumStatus.mockResolvedValue({});
  mockUpdateUserStripeCustomerId.mockResolvedValue({});
});

describe("createCheckoutSession", () => {
  it("throws when Stripe Premium is not configured", async () => {
    mockIsConfigured.mockReturnValue(false);

    await expect(createCheckoutSession("user-1")).rejects.toThrow("not configured");
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer for a user with none yet, then a checkout session", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockFindUserById.mockResolvedValue({ id: "user-1", email: "owner@example.com", stripe_customer_id: null });
    mockCreateCustomer.mockResolvedValue({ id: "cus_new" });
    mockCreateSubscriptionCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/session-1" });

    const result = await createCheckoutSession("user-1");

    expect(mockCreateCustomer).toHaveBeenCalledWith("owner@example.com");
    expect(mockUpdateUserStripeCustomerId).toHaveBeenCalledWith("user-1", "cus_new");
    expect(mockCreateSubscriptionCheckoutSession).toHaveBeenCalledWith(
      "cus_new",
      expect.stringContaining("/store/premium"),
      expect.stringContaining("/store/premium")
    );
    expect(result).toEqual({ checkout_url: "https://checkout.stripe.com/session-1" });
  });

  it("reuses an existing Stripe customer id without creating a new one", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockFindUserById.mockResolvedValue({ id: "user-1", email: "owner@example.com", stripe_customer_id: "cus_existing" });
    mockCreateSubscriptionCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/session-2" });

    await createCheckoutSession("user-1");

    expect(mockCreateCustomer).not.toHaveBeenCalled();
    expect(mockCreateSubscriptionCheckoutSession).toHaveBeenCalledWith(
      "cus_existing",
      expect.any(String),
      expect.any(String)
    );
  });
});

describe("cancelSubscription", () => {
  it("fails cleanly when the user has no Stripe customer id", async () => {
    mockFindUserById.mockResolvedValue({ id: "user-1", stripe_customer_id: null });

    await expect(cancelSubscription("user-1")).rejects.toThrow("No active subscription found");
    expect(mockListActiveSubscriptions).not.toHaveBeenCalled();
  });

  it("fails cleanly when Stripe reports no active subscriptions", async () => {
    mockFindUserById.mockResolvedValue({ id: "user-1", stripe_customer_id: "cus_1" });
    mockListActiveSubscriptions.mockResolvedValue([]);

    await expect(cancelSubscription("user-1")).rejects.toThrow("No active subscription found");
    expect(mockUpdateUserPremiumStatus).not.toHaveBeenCalled();
  });

  it("cancels every active subscription and flips is_premium off", async () => {
    mockFindUserById.mockResolvedValue({ id: "user-1", stripe_customer_id: "cus_1" });
    mockListActiveSubscriptions.mockResolvedValue([{ id: "sub_1" }, { id: "sub_2" }]);

    await cancelSubscription("user-1");

    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_1");
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_2");
    expect(mockUpdateUserPremiumStatus).toHaveBeenCalledWith("user-1", false);
  });
});

describe("handleSubscriptionWebhookEvent", () => {
  it("activates Premium on checkout.session.completed", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1" } }
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: "user-1" });

    const result = await handleSubscriptionWebhookEvent(Buffer.from("{}"), "sig");

    expect(mockUpdateUserPremiumStatus).toHaveBeenCalledWith("user-1", true);
    expect(result).toEqual({ received: true });
  });

  it("deactivates Premium on customer.subscription.deleted", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_1", status: "canceled" } }
    });
    mockFindUserByStripeCustomerId.mockResolvedValue({ id: "user-1" });

    await handleSubscriptionWebhookEvent(Buffer.from("{}"), "sig");

    expect(mockUpdateUserPremiumStatus).toHaveBeenCalledWith("user-1", false);
  });

  it("ignores events for a customer id with no matching user", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { customer: "cus_unknown" } }
    });
    mockFindUserByStripeCustomerId.mockResolvedValue(null);

    await handleSubscriptionWebhookEvent(Buffer.from("{}"), "sig");

    expect(mockUpdateUserPremiumStatus).not.toHaveBeenCalled();
  });

  it("propagates a signature verification failure", async () => {
    mockConstructWebhookEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed");
    });

    await expect(handleSubscriptionWebhookEvent(Buffer.from("{}"), "bad-sig")).rejects.toThrow(
      "signature verification failed"
    );
  });
});
