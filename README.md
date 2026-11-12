Sentinel AI

A security guard for autonomous agents on NEAR Protocol.

Sentinel AI is a risk-based authorization layer designed to help prevent autonomous agents from performing unsafe blockchain actions. It evaluates security signals before a transaction reaches the signing function and returns one of three decisions: "ALLOW", "WARN", or "BLOCK".

Live Demo: https://nostrings-cyber.github.io/sentinel-ai./

Hackathon: NEAR Hackathon 2026
Track: AI Security & Defense

---

The Problem

Autonomous agents can be manipulated through malicious instructions, unsafe recipients, and interactions with suspicious smart contracts.

An agent that signs and broadcasts an unsafe transaction may cause irreversible financial losses.

Existing agent workflows need a security layer that evaluates proposed actions before signing.

The Solution

Sentinel AI introduces a transaction authorization guard between an autonomous agent and its signing function.

Every assessed action receives one of three decisions:

Decision| Behaviour
"ALLOW"| Permits the signing function to execute.
"WARN"| Requires explicit human approval.
"BLOCK"| Prevents the signing function from executing.

The authorization guard enforces the decision before invoking the signing callback.

Security Architecture

Sentinel AI consists of five main components:

1. Account Inspection: Retrieves NEAR account information, access-key details, and contract information.
2. Risk Assessment: Evaluates available security signals and calculates a risk score.
3. Authorization Guard: Enforces ALLOW, WARN, and BLOCK decisions.
4. Restricted Signing: Demonstrates NEAR FunctionCall access keys restricted to specific contracts and methods.
5. Transaction Analysis API: Provides heuristic transaction activity analysis through a separate Cloudflare Worker.

Authorization Flow

Agent action → Risk assessment → Security decision → Authorization guard → Signing callback (if permitted).

NEAR Testnet Demonstration

Sentinel AI has been tested using the following NEAR testnet account:

"sentinel-lab-2026.testnet"

A restricted FunctionCall access key was created with these permissions:

Setting| Value
Network| NEAR Testnet
Contract| "sentinel-lab-2026.testnet"
Permitted method| "set_message"
Allowance| 1 NEAR
Key type| FunctionCall

Verified On-chain Results

- The restricted key successfully called "set_message".
- A subsequent read returned: "Signed by Sentinel restricted key".
- An attempt to call "new" using the restricted key was rejected because the method was not permitted.

Transaction evidence:
"View successful testnet transaction on NEAR Explorer" (https://explorer.testnet.near.org/transactions/9KHQywizXaEfw21c6dqifhjsP6EiScAdAFkBMtA7UYNA)

These results demonstrate method-level permission enforcement by the NEAR protocol.

Agent Authorization Guard

The authorization guard is implemented in "agentGuard.js".

It accepts:

- A security signal assessment.
- A transaction signing callback.
- A human approval callback when required.

Its behaviour:

- "BLOCK": Never invokes the signing callback.
- "WARN": Requires explicit human approval before signing.
- "ALLOW": Invokes the signing callback without requiring approval.

The current implementation demonstrates authorization using a simulated signing callback. It is not yet a production wallet integration.

Malicious Agent Attack Simulation

Sentinel AI includes a simulated attack scenario demonstrating how the authorization guard can stop an unsafe transaction.

Attack Scenario

An untrusted instruction attempts to manipulate an autonomous agent into sending 5 NEAR to an attacker-controlled recipient.

Sentinel's Response

1. The simulated agent presents the attempted transaction.
2. Sentinel evaluates the supplied security signals.
3. The malicious blocklist signal identifies the receiver as unsafe.
4. Sentinel returns "BLOCK" with a risk score of 100.
5. The signing callback is never executed.

Verified Simulation Output

SENTINEL DECISION: BLOCK
RISK SCORE: 100
TRANSACTION SIGNED: false
SIGNER CALLED: false
PASS: SENTINEL STOPPED THE ATTACK.

The simulation uses a simulated agent and signing callback. It does not execute a real transfer or connect to a live autonomous AI agent.

Running the Authorization Tests

The project includes four browser-based authorization tests in "agentGuard.test.js".

Instructions

1. Open the "hosted Sentinel AI demo" (https://nostrings-cyber.github.io/sentinel-ai./).
2. Open the Eruda browser console.
3. Execute the following command:

import("https://nostrings-cyber.github.io/sentinel-ai./agentGuard.test.js")
  .then(() => console.log("TEST MODULE LOADED"))
  .catch(error => console.error("TEST ERROR:", error));

The test module automatically executes all four tests when imported.

Expected Results

PASS: BLOCK prevents signing
PASS: WARN requires human approval
PASS: WARN proceeds after human approval
PASS: ALLOW proceeds without approval

SENTINEL AI: ALL 4 TESTS PASSED

These tests use simulated signing callbacks. They do not broadcast real blockchain transactions.

Project Components

File / Component| Purpose
"index.html"| Browser-based NEAR account inspection interface.
"sentinel.js"| Account inspection and risk assessment logic.
"agentGuard.js"| Transaction authorization wrapper.
"agentGuard.test.js"| Automated authorization tests.
"attackDemo.js"| Simulated malicious transaction demonstration.
"Test-attack.html"| Separate attack demonstration interface.
Cloudflare Worker| Separate heuristic transaction-analysis API.

Current Limitations

Sentinel AI is a hackathon prototype, not a production security product.

- Risk analysis uses heuristics and may produce incomplete assessments.
- The browser interface does not yet provide a complete autonomous-agent wallet integration.
- The signing guard demonstration uses a simulated signer.
- Browser-stored contract fingerprints are not tamper-proof.
- The transaction-analysis API is separate from the browser interface.
- The project has not undergone an independent security audit.

Sentinel AI should not be used as the sole security control for real funds.

Demo and Resources

- Hosted Demo: https://nostrings-cyber.github.io/sentinel-ai./
- GitHub Repository: https://github.com/Nostrings-cyber/sentinel-ai.
- NEAR Testnet Account: "sentinel-lab-2026.testnet"
- On-chain Transaction: "View on NEAR Explorer" (https://explorer.testnet.near.org/transactions/9KHQywizXaEfw21c6dqifhjsP6EiScAdAFkBMtA7UYNA)

License

This project is licensed under the MIT License. See the "LICENSE" file for details.