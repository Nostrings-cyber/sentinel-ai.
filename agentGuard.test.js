import { guardAndSign } from "./agentGuard.js";

const safeSignals = {
  knownMalicious: false,
  suspiciousCodeChange: false,
  unusualActivity: false,
  suspiciousHistory: false,
  riskyAccessKeys: false,
  failedInteractions: false
};

async function runTest(name, test) {
  try {
    await test();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`, error.message);
    throw error;
  }
}

async function runAllTests() {

  // TEST 1: BLOCK prevents signing
  await runTest("BLOCK prevents signing", async () => {
    let signerCalled = false;

    const result = await guardAndSign({
      signals: {
        ...safeSignals,
        knownMalicious: true
      },
      signTransaction: async () => {
        signerCalled = true;
        return "SIMULATED_TRANSACTION";
      }
    });

    if (
      result.decision !== "BLOCK" ||
      result.signed !== false ||
      signerCalled !== false
    ) {
      throw new Error("BLOCK did not prevent signing.");
    }
  });

  // TEST 2: WARN requires human approval
  await runTest("WARN requires human approval", async () => {
    let signerCalled = false;

    const result = await guardAndSign({
      signals: {
        ...safeSignals,
        suspiciousCodeChange: true,
        unusualActivity: true
      },
      signTransaction: async () => {
        signerCalled = true;
        return "SIMULATED_TRANSACTION";
      },
      requestHumanApproval: async () => false
    });

    if (
      result.decision !== "WARN" ||
      result.signed !== false ||
      signerCalled !== false
    ) {
      throw new Error("WARN allowed signing without approval.");
    }
  });

  // TEST 3: WARN proceeds after approval
  await runTest("WARN proceeds after human approval", async () => {
    const result = await guardAndSign({
      signals: {
        ...safeSignals,
        suspiciousCodeChange: true,
        unusualActivity: true
      },
      signTransaction: async () => "APPROVED_TRANSACTION",
      requestHumanApproval: async () => true
    });

    if (
      result.decision !== "WARN" ||
      result.signed !== true ||
      result.transaction !== "APPROVED_TRANSACTION"
    ) {
      throw new Error("Approved WARN transaction did not proceed.");
    }
  });

  // TEST 4: ALLOW proceeds without approval
  await runTest("ALLOW proceeds without approval", async () => {
    const result = await guardAndSign({
      signals: safeSignals,
      signTransaction: async () => "SAFE_TRANSACTION"
    });

    if (
      result.decision !== "ALLOW" ||
      result.signed !== true ||
      result.transaction !== "SAFE_TRANSACTION"
    ) {
      throw new Error("ALLOW did not proceed.");
    }
  });

  console.log("SENTINEL AI: ALL 4 TESTS PASSED");
}

runAllTests();
