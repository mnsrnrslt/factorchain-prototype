Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# FactorChain prototype

A small smart contract, `ReceivableRegistry`, for the startup idea FactorChain: a shared registry that stops one invoice from being financed twice.

**Demo video:** [add link]

## What it does

- A supplier registers an invoice. Only a hash (a fingerprint) and a status are stored, never documents, names or amounts.
- An approved financier can take a registered invoice (`assignReceivable`).
- A second financier who tries the same invoice is refused.
- The assigned financier can confirm settlement, release the invoice, or either party can open a dispute.
- Statuses: Registered, Assigned, Settled, Disputed, Expired.

## Roles

| Role | Rights |
|---|---|
| Admin (deployer) | Approves financiers |
| Supplier | Registers an invoice, can open a dispute |
| Approved financier | Assigns a registered invoice |
| Assigned financier | Confirms settlement, releases, can open a dispute |
| Anyone | Reads the status, expires an old unassigned invoice |

## Run it (local network only)

You need Node.js 18 or newer.

```
npm install
npx hardhat test
npm run demo
```

`npx hardhat test` runs 6 unit tests on the local Hardhat network with test accounts.
`npm run demo` deploys the contract and walks through the main use case.

No real network, no real keys and no real funds are used. Test data is invented.

## License

MIT
