
import { guardAndSign } from "./agentGuard.js";

async function runBlockTest() {
  let signerCalled = false;

  const result = await guardAndSign({
    signals: {
      knownMalicious: true,
      suspiciousCodeChange: false,
      unusualActivity: false,
      suspiciousHistory: false,
      riskyAccessKeys: false,
      failedInteractions: false
    },

    signTransaction: async () => {
      signerCalled = true;
      return "SIMULATED_TRANSACTION";
    }
  });

  console.log("BLOCK GUARD TEST:", result);
  console.log("SIGNER CALLED:", signerCalled);

  if (
    result.decision === "BLOCK" &&
    result.signed === false &&
    signerCalled === false
  ) {
    console.log("PASS: Sentinel prevented signing.");
  } else {
    console.error("FAIL: Signing prevention did not work.");
  }
}

runBlockTest();
