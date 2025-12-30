"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { detectSubscriptions } = require("../../lib/subscription-detection");
const {
  findKnownSubscription,
  isSubscriptionCategory,
} = require("../../lib/known-subscriptions");

test("detectSubscriptions: detects monthly subscription pattern", () => {
  const transactions = [
    {
      id: "1",
      date: "2024-01-15",
      merchant: "Netflix",
      amount: -9.99,
      categoryId: "entertainment",
    },
    {
      id: "2",
      date: "2024-02-15",
      merchant: "Netflix",
      amount: -9.99,
      categoryId: "entertainment",
    },
    {
      id: "3",
      date: "2024-03-15",
      merchant: "Netflix",
      amount: -9.99,
      categoryId: "entertainment",
    },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(candidates.length, 1, "Should detect one subscription");
  assert.ok(
    candidates[0].merchantKey.includes("netflix") ||
      candidates[0].merchant.toLowerCase().includes("netflix"),
    "Merchant should be detected"
  );
  assert.strictEqual(
    candidates[0].frequency,
    "monthly",
    "Should detect monthly frequency"
  );
  assert.strictEqual(
    candidates[0].estimatedMonthlyAmount,
    9.99,
    "Monthly amount should match"
  );
  assert.strictEqual(
    candidates[0].occurrenceCount,
    3,
    "Should count 3 occurrences"
  );
  assert.ok(
    candidates[0].confidenceScore > 0.4,
    "Should have reasonable confidence"
  );
});

test("detectSubscriptions: requires minimum occurrences", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "UnknownService", amount: -9.99 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    0,
    "Should not detect subscription with only one occurrence (unless known service)"
  );
});

test("detectSubscriptions: handles amount variance", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "Service", amount: -10.0 },
    { id: "2", date: "2024-02-15", merchant: "Service", amount: -10.5 },
    { id: "3", date: "2024-03-15", merchant: "Service", amount: -9.95 },
  ];

  const candidates = detectSubscriptions(transactions, {
    minOccurrences: 2,
    amountVarianceTolerance: 0.05,
  });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect subscription with small variance"
  );
  assert.ok(
    candidates[0].variancePercentage < 0.05,
    "Variance should be within tolerance"
  );
});

test("detectSubscriptions: excludes high variance patterns", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "Variable", amount: -10.0 },
    { id: "2", date: "2024-02-15", merchant: "Variable", amount: -50.0 },
    { id: "3", date: "2024-03-15", merchant: "Variable", amount: -5.0 },
  ];

  const candidates = detectSubscriptions(transactions, {
    minOccurrences: 2,
    maxVarianceThreshold: 0.15,
  });

  assert.strictEqual(
    candidates.length,
    0,
    "Should exclude high variance patterns"
  );
});

test("detectSubscriptions: detects bi-weekly pattern", () => {
  const transactions = [
    { id: "1", date: "2024-01-01", merchant: "BiWeekly", amount: -20.0 },
    { id: "2", date: "2024-01-15", merchant: "BiWeekly", amount: -20.0 },
    { id: "3", date: "2024-01-29", merchant: "BiWeekly", amount: -20.0 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect bi-weekly subscription"
  );
  assert.strictEqual(
    candidates[0].frequency,
    "bi-weekly",
    "Should detect bi-weekly frequency"
  );
  assert.ok(
    candidates[0].estimatedMonthlyAmount > 40,
    "Monthly amount should be normalized (2.17x)"
  );
});

test("detectSubscriptions: detects quarterly pattern", () => {
  const transactions = [
    { id: "1", date: "2024-01-01", merchant: "Quarterly", amount: -30.0 },
    { id: "2", date: "2024-04-01", merchant: "Quarterly", amount: -30.0 },
    { id: "3", date: "2024-07-01", merchant: "Quarterly", amount: -30.0 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect quarterly subscription"
  );
  assert.strictEqual(
    candidates[0].frequency,
    "quarterly",
    "Should detect quarterly frequency"
  );
  assert.strictEqual(
    candidates[0].estimatedMonthlyAmount,
    10,
    "Monthly amount should be normalized (amount/3)"
  );
});

test("detectSubscriptions: groups by normalized merchant name", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "Netflix Inc", amount: -9.99 },
    { id: "2", date: "2024-02-15", merchant: "Netflix", amount: -9.99 },
    { id: "3", date: "2024-03-15", merchant: "NETFLIX", amount: -9.99 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should group normalized merchant names"
  );
  assert.strictEqual(
    candidates[0].occurrenceCount,
    3,
    "Should count all occurrences"
  );
});

test("detectSubscriptions: returns empty array for no transactions", () => {
  const candidates = detectSubscriptions([], { minOccurrences: 2 });

  assert.strictEqual(candidates.length, 0, "Should return empty array");
});

test("detectSubscriptions: sorts by confidence score", () => {
  const transactions = [
    // High confidence: Netflix (3 occurrences, consistent)
    { id: "1", date: "2024-01-15", merchant: "Netflix", amount: -9.99 },
    { id: "2", date: "2024-02-15", merchant: "Netflix", amount: -9.99 },
    { id: "3", date: "2024-03-15", merchant: "Netflix", amount: -9.99 },
    // Lower confidence: Spotify (2 occurrences)
    { id: "4", date: "2024-01-20", merchant: "Spotify", amount: -9.99 },
    { id: "5", date: "2024-02-20", merchant: "Spotify", amount: -9.99 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(candidates.length, 2, "Should detect both subscriptions");
  assert.ok(
    candidates[0].confidenceScore >= candidates[1].confidenceScore,
    "Should sort by confidence (highest first)"
  );
  assert.strictEqual(
    candidates[0].merchant,
    "netflix",
    "Netflix should be first (higher confidence)"
  );
});

test("detectSubscriptions: detects known subscription services with single occurrence", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "Netflix.com", amount: -9.99 },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect known service with single occurrence"
  );
  assert.strictEqual(
    candidates[0].merchant,
    "netflix",
    "Merchant should be normalized"
  );
  assert.strictEqual(
    candidates[0].detectionMethod,
    "known-service",
    "Should use known-service detection"
  );
  assert.strictEqual(
    candidates[0].patternType,
    "known-service",
    "Pattern type should be known-service"
  );
  assert.strictEqual(
    candidates[0].frequency,
    "monthly",
    "Should use typical frequency for known service"
  );
  assert.ok(
    candidates[0].confidenceScore > 0.8,
    "Should have high confidence for known service"
  );
});

test("detectSubscriptions: detects category-based subscriptions", () => {
  const transactions = [
    {
      id: "1",
      date: "2024-01-15",
      merchant: "MyService",
      amount: -9.99,
      category: "subscription",
    },
    {
      id: "2",
      date: "2024-02-15",
      merchant: "MyService",
      amount: -9.99,
      category: "subscription",
    },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect category-based subscription"
  );
  assert.strictEqual(
    candidates[0].detectionMethod,
    "category",
    "Should use category detection"
  );
  assert.strictEqual(
    candidates[0].patternType,
    "category-based",
    "Pattern type should be category-based"
  );
  assert.ok(
    candidates[0].confidenceScore > 0.7,
    "Should have boosted confidence for category-based"
  );
});

test("detectSubscriptions: detects subscription with categoryId containing subscription keyword", () => {
  const transactions = [
    {
      id: "1",
      date: "2024-01-15",
      merchant: "ServiceX",
      amount: -9.99,
      categoryId: "recurring-subscription",
    },
    {
      id: "2",
      date: "2024-02-15",
      merchant: "ServiceX",
      amount: -9.99,
      categoryId: "recurring-subscription",
    },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect subscription with subscription categoryId"
  );
  assert.strictEqual(
    candidates[0].detectionMethod,
    "category",
    "Should use category detection"
  );
});

test("detectSubscriptions: known service overrides pattern detection", () => {
  const transactions = [
    { id: "1", date: "2024-01-15", merchant: "Spotify USA", amount: -9.99 },
    { id: "2", date: "2024-02-20", merchant: "Spotify", amount: -10.5 }, // Irregular interval
    { id: "3", date: "2024-03-10", merchant: "Spotify", amount: -9.99 }, // Irregular interval
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(
    candidates.length,
    1,
    "Should detect known service despite irregular pattern"
  );
  assert.strictEqual(
    candidates[0].merchant,
    "spotify",
    "Merchant should be normalized"
  );
  assert.strictEqual(
    candidates[0].detectionMethod,
    "known-service",
    "Should use known-service detection"
  );
});

test("detectSubscriptions: known service uses typical frequency when pattern unclear", () => {
  const transactions = [
    {
      id: "1",
      date: "2024-01-15",
      merchant: "YouTube Premium",
      amount: -11.99,
    },
  ];

  const candidates = detectSubscriptions(transactions, { minOccurrences: 2 });

  assert.strictEqual(candidates.length, 1, "Should detect known service");
  assert.strictEqual(
    candidates[0].frequency,
    "monthly",
    "Should use typical monthly frequency"
  );
  assert.strictEqual(
    candidates[0].patternType,
    "known-service",
    "Should mark as known-service pattern"
  );
});

test("findKnownSubscription: matches known subscription services", () => {
  assert.ok(findKnownSubscription("Netflix"), "Should match Netflix");
  assert.ok(
    findKnownSubscription("Spotify.com"),
    "Should match Spotify with domain"
  );
  assert.ok(
    findKnownSubscription("YouTube Premium"),
    "Should match YouTube Premium"
  );
  assert.ok(
    findKnownSubscription("Adobe Creative Cloud"),
    "Should match Adobe"
  );
  assert.ok(
    findKnownSubscription("Microsoft 365"),
    "Should match Microsoft 365"
  );
  assert.strictEqual(
    findKnownSubscription("Unknown Service"),
    null,
    "Should return null for unknown service"
  );
});

test("isSubscriptionCategory: identifies subscription categories", () => {
  assert.strictEqual(
    isSubscriptionCategory("subscription"),
    true,
    'Should match "subscription"'
  );
  assert.strictEqual(
    isSubscriptionCategory("recurring"),
    true,
    'Should match "recurring"'
  );
  assert.strictEqual(
    isSubscriptionCategory("membership"),
    true,
    'Should match "membership"'
  );
  assert.strictEqual(
    isSubscriptionCategory("premium"),
    true,
    'Should match "premium"'
  );
  assert.strictEqual(
    isSubscriptionCategory("streaming"),
    true,
    'Should match "streaming"'
  );
  assert.strictEqual(
    isSubscriptionCategory("software"),
    true,
    'Should match "software"'
  );
  assert.strictEqual(
    isSubscriptionCategory("saas"),
    true,
    'Should match "saas"'
  );
  assert.strictEqual(
    isSubscriptionCategory("entertainment"),
    false,
    "Should not match generic category"
  );
  assert.strictEqual(isSubscriptionCategory(null), false, "Should handle null");
});
