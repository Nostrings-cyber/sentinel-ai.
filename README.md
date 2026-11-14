Sentinel AI

Sentinel AI is a security tool for the NEAR blockchain. It checks accounts and smart contracts for possible risks before an AI agent interacts with them.

It returns one of three decisions:

- ALLOW: The interaction can proceed.
- WARN: Human approval is required.
- BLOCK: The interaction must be stopped.

Live Demo

Dashboard: https://nostrings-cyber.github.io/sentinel-ai./

Attack Demo: https://nostrings-cyber.github.io/sentinel-ai./Test-attack.html

How to Test

1. Open the dashboard.
2. Enter a NEAR account ID in the Recipient Account field.
3. Click INSPECT ACCOUNT.
4. Review the risk score, security checks and decision.

Attack Simulation

Open the Attack Demo and click Run attack simulation.

The demo simulates an AI agent attempting to send 5 NEAR to a blocked recipient.

Expected result:

- Decision: BLOCK
- Risk score: 100
- Signed: false
- Signer called: false

This is a simulation. No real transaction is sent.

Security Checks

Sentinel AI checks:

- Account information and activity.
- Access key configuration.
- Smart contract information.
- Contract code changes.
- Transaction history.
- Known blocked recipients.

Risk Decisions

BLOCK is returned when a recipient is confirmed malicious or the risk score reaches 70.

WARN is returned when the risk score reaches 30 or a required security check is unavailable.

ALLOW is returned when the risk score is below 30 and the required checks are available.

Agent Protection

The agent guard controls whether an agent can sign an interaction.

- BLOCK prevents signing.
- WARN requires human approval.
- ALLOW permits signing.

The guard tests use simulated signing callbacks. They do not send real blockchain transactions.

Running the Tests

Requirements: Node.js 22 or later.

Run:

"node --experimental-default-type=module agentGuard.test.js"

The tests check that:

1. BLOCK prevents signing.
2. WARN requires human approval.
3. WARN without approval prevents signing.
4. WARN proceeds after approval.
5. ALLOW proceeds without approval.

Testnet Demonstration

Sentinel AI includes a testnet demonstration using a restricted function-call access key.

The key is limited to a specific contract and method. An authorized method succeeds, while an unauthorized method is rejected.

Testnet account: sentinel-lab-2026.testnet

Transaction:
https://explorer.testnet.near.org/transactions/9KHQywizXaEfw21c6dqifhjsP6EiScAdAFkBMtA7UYNA

Project Structure

- index.html: Main dashboard.
- sentinel.js: Security scanning logic.
- agentGuard.js: Agent signing protection.
- agentGuard.test.js: Automated tests.
- attackDemo.js: Attack simulation.
- Test-attack.html: Attack demo page.
- Blocklist.json: Shared blocklist.
- Backend/worker.js: Backend worker source.
- test-fixtures/: Test data.

Limitations

Some independent RPC checks may be unavailable because of network, connectivity or endpoint issues.

Contract fingerprint history is stored in browser local storage. It is not a permanent or tamper-proof audit record.

Transaction analysis uses a limited sample of recent transactions.

A warning does not automatically mean an account is malicious. It means further review may be needed.

License

This project is licensed under the MIT License.