import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.PUBLISHING_PROVIDER_MODE = "mock";
process.env.ENABLE_AUTO_PUBLISHING = "false";

const { preflightPublishing, publishWithProvider, retryDelayMs, maxAttemptsReached } = await import("../artifacts/api-server/src/services/socialPublishingService.ts");

const blocked = preflightPublishing({
  provider: "instagram",
  caption: "Test",
  mediaUrl: "https://cdn.example.test/image.jpg",
  approvalId: null,
  governanceApproved: false,
});
assert.equal(blocked.allowed, false);

const ready = preflightPublishing({
  provider: "instagram",
  caption: "Transparenter KI-Testpost",
  mediaUrl: "https://cdn.example.test/image.jpg",
  approvalId: "approval_test_1",
  governanceApproved: true,
});
assert.equal(ready.allowed, true);

const first = await publishWithProvider({
  id: 1,
  idempotencyKey: "same-job",
  provider: "instagram",
  caption: "Transparenter KI-Testpost",
  mediaUrl: "https://cdn.example.test/image.jpg",
  approvalId: "approval_test_1",
  governanceApproved: true,
  attemptCount: 0,
});
const second = await publishWithProvider({
  id: 2,
  idempotencyKey: "same-job",
  provider: "instagram",
  caption: "Transparenter KI-Testpost",
  mediaUrl: "https://cdn.example.test/image.jpg",
  approvalId: "approval_test_1",
  governanceApproved: true,
  attemptCount: 0,
});
assert.equal(first.success, true);
assert.equal(first.mock, true);
assert.equal(first.postId, second.postId);
assert.equal(maxAttemptsReached(2), false);
assert.equal(maxAttemptsReached(3), true);
assert.equal(retryDelayMs(1), 5000);
assert.equal(retryDelayMs(4), 40000);

console.log("Publishing-Pipeline-Mocktests erfolgreich");
