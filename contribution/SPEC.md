# PoliMap Contribution System — Design Spec

## Overview

A decentralized, consensus-driven data correction system for PoliMap. Users propose edits to political data, other users confirm them, and once a threshold is reached the data is updated live. Contributors are rewarded with non-transferrable soulbound tokens (SBTs) which gate forum flair tiers.

---

## Infrastructure

- **Hosting:** Iceland VPS (user-controlled)
- **Web server:** nginx (currently serving static files)
- **API layer:** Node.js / Express (to be added)
- **Database:** MongoDB (running in Docker)
- **Blockchain:** Base (L2, EVM-compatible, near-zero gas fees)
- **Wallet:** MetaMask (user identity + token receipt)

---

## Contribution Flow

1. User visits `/contribute` page
2. User connects MetaMask wallet
3. User browses/searches for the data they want to correct
4. User submits a proposed edit (proposal opens, stored in MongoDB)
5. Other wallet-holders see the proposal in the **Active Proposals** feed
6. They review and vote to confirm (vote is a free wallet signature — no gas)
7. When the weighted vote threshold is reached → JSON on disk is rewritten → change goes live
8. All confirming voters **and the original proposer** each receive 1 SBT
9. If a conflicting proposal exists for the same field → FPTP: first to hit threshold wins, the other is hard-deleted
10. If the proposal does not reach threshold within **7 days** → it expires and is deleted
11. Proposals can also be deleted if reported as spam (5 weighted report-points = hard-deleted)

---

## Spam & Abuse

### Proposal Rate Limiting (Hybrid)
- **0-token wallets** — max 1 open proposal at a time. Allows good-faith newcomers to contribute without enabling spam floods.
- **Token holders (≥1 token)** — max 3 concurrent open proposals.
- These limits are per wallet address, enforced by the backend on `POST /api/proposals`.

### Spam Reporting
- Only wallets with **≥1 token** can submit a spam report (prevents throwaway wallets from report-bombing)
- Reports use the **same logarithmic weighting** as votes
- **5 weighted report-points** = proposal is hard-deleted from MongoDB immediately
- The proposer's wallet receives a **strike**

### Strike & Penalty System
- Strikes are tracked per wallet in MongoDB
- Each confirmed spam deletion (proposal hard-deleted via reports) issues 1 strike to the proposer
- **Penalty mechanic is token-based:**
  - Strike 1 → warning (no token loss)
  - Strike 2 → 1 SBT burned from proposer's balance (contract owner calls `burn`)
  - Strike 3 → wallet **blacklisted** from proposing entirely (can still vote and confirm others' proposals)
- Blacklisted wallets are stored in a `blacklist` MongoDB collection and checked on every `POST /api/proposals`

### Redemption
- Users can redeem strikes by burning tokens they earned **after** the strike was issued
- This ensures redemption requires genuine post-strike contribution — you cannot pay off a strike with tokens you accumulated before the bad behaviour
- **Rate:** 5 tokens burned = 1 strike cleared
- **Verification:** the contract's on-chain `earnedAt[tokenId]` is compared against the strike's MongoDB timestamp — tokens with `earnedAt` ≤ strike date are ineligible
- The backend queries `earnedAt` for the user's tokens via a free `eth_call`, filters eligible tokens, then calls `burn()` for 5 of them if enough qualify
- **Blacklisted wallets** cannot self-redeem — an admin must manually unblacklist the wallet first (human confirmation that the wallet is acting in good faith), after which normal redemption applies
- The philosophy: redemption comes from contribution, not from payment. You have to earn your way back before you can spend your way clear.

### Sybil Resistance
- Logarithmic vote weighting handles this naturally — passing a proposal with fresh wallets requires coordinating at least 8 separate MetaMask identities
- No additional mechanism needed unless abuse is observed in practice

### Admin Override
A protected admin endpoint (or internal API) allows:
- Hard-delete any proposal
- Blacklist any wallet address manually
- Manually pass a proposal (for known-correct data)
- Unblacklist a wallet

---

## Editable Data

All fields in member JSON files are editable **except photos**.

This includes (but is not limited to):
- Names
- Phone numbers
- Office addresses
- Email addresses
- Party affiliation
- Riding/constituency names
- Municipal and RCMP detachment data

---

## Voting System

### Identity
- One MetaMask wallet = one voter identity
- Votes are verified via a free wallet signature (proves key ownership, no gas cost)
- No IP-based verification

### Weighting
- Each voter's vote is weighted **logarithmically** by their token balance
- A new voter (0–1 tokens) has base weight of 1
- Weight grows slowly with token accumulation — prevents oligarchy
- Formula TBD at implementation (e.g. `weight = 1 + log2(tokenBalance + 1)`)

### Threshold
- A proposal passes when it accumulates **8 weighted vote points**
- This means 8 new wallets OR fewer high-trust wallets

### Conflict Resolution
- If two proposals are open simultaneously for the same field:
  - **First Past The Post** — whichever hits threshold first wins
  - The losing proposal is immediately hard-deleted from MongoDB

---

## Soulbound Token (SBT)

### Contract
- **Standard:** ERC-721
- **Chain:** Base
- **Transfers:** Permanently disabled (except owner → wallet, i.e. minting)
- **Burning:** Contract owner can call `burn(tokenId)` — for key compromise scenarios
- **Minting:** Owner calls `batchMint(address[])` — triggered automatically by backend when a proposal passes
- **No:** royalties, marketplace metadata, trading of any kind

### Minting
- Tokens are **batch pre-minted** in large pools (tens of thousands at a time) to the contract owner's address — not minted individually per contribution
- When a user earns a token, it is **transferred** from the owner wallet to the user's wallet
- This keeps per-contribution gas cost near-zero (transfer only, no mint)
- On proposal pass: backend calls a batch transfer function with the array of earning wallet addresses
- VPS holds the contract owner hot wallet private key (accepted risk)
- Key compromise contingency: owner can burn tokens and a `transferOwnership` function exists to migrate to a new key

### `earnedAt` Timestamp (On-Chain)
- Because tokens are batch-minted ahead of time, `mintedAt` (the block timestamp of the original mint) is meaningless for tracking when a user actually earned a token
- Instead, the contract records `earnedAt` — the block timestamp of the transfer from owner → recipient:
  ```solidity
  mapping(uint256 => uint256) public earnedAt; // tokenId => block.timestamp of transfer to recipient

  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
      if (from == owner() && to != address(0)) {
          earnedAt[tokenId] = block.timestamp;
      }
  }
  ```
- This timestamp is **on-chain and publicly verifiable** — trust does not depend on the backend
- Used by the redemption system to verify that tokens being burned were earned after a strike was issued

### Token Utility
- Used exclusively to gate **forum flair tiers** on `forum.poli-map.org`
- Forum reads `balanceOf(walletAddress)` directly from the Base contract
- No monetary value, not exchangeable

---

## Forum Flair Tiers

Flair is assigned based on on-chain token balance read by the forum.

| Token Balance | Flair Tier    |
|---------------|---------------|
| 1–9           | Constituent   |
| 10–49         | Delegate      |
| 50–199        | Councillor    |
| 200–499       | Minister      |
| 500+          | Elder         |

> Tier names are a working proposal — subject to change.

### Integration
- Forum already handles MetaMask wallet reads and ZKP pk/pk pairs for posting
- Only change needed: read `balanceOf` for PoliMap SBT contract address → map to flair tier
- No additional work required on the PoliMap backend side

---

## Contribute Page (Frontend)

- Standalone page (`contribute.html`) — not integrated into the map view
- Sections:
  - **Connect Wallet** — MetaMask connection prompt
  - **Propose an Edit** — browse/search for data, select field, submit new value
  - **Active Proposals** — live feed of pending proposals showing:
    - What data is being changed (field, current value → proposed value)
    - Vote point total vs threshold
    - Time remaining (7-day countdown)
    - Confirm button (triggers wallet signature)

---

## Backend (Node.js / Express)

### Endpoints (planned)
- `POST /api/proposals` — submit a new proposal (checks blacklist + concurrent cap)
- `GET /api/proposals` — list active proposals
- `POST /api/proposals/:id/vote` — submit a signed vote
- `POST /api/proposals/:id/report` — report as spam (requires ≥1 token, weighted)
- `POST /api/strikes/redeem` — burn 5 post-strike tokens to clear 1 strike (wallet-signed)
- `POST /api/admin/proposals/:id/delete` — admin hard-delete
- `POST /api/admin/proposals/:id/pass` — admin manual pass
- `POST /api/admin/blacklist` — admin blacklist/unblacklist wallet
- Internal: proposal pass handler → JSON rewrite → batch transfer tokens to earners
- Internal: spam threshold handler → hard-delete → issue strike → burn token if strike 2+

### MongoDB Collections
- `proposals` — pending/active proposals
- `votes` — individual vote records (wallet, proposalId, weight, signature, timestamp)
- `reports` — spam reports (wallet, proposalId, weight, timestamp)
- `strikes` — strike records per wallet (wallet, count, history, timestamps)
- `blacklist` — blacklisted wallet addresses
- `redemptions` — log of completed redemptions (wallet, strikeCleared, tokensBurned, timestamp)

### Cron Jobs
- Every hour (or similar): expire proposals older than 7 days
- On proposal pass: trigger JSON rewrite + mint

### JSON Rewrite
- On threshold reached: load relevant JSON file from disk, update the specific field, write back
- nginx serves the updated static file immediately — no cache invalidation needed unless nginx caching is configured

---

## Open Questions

- **Flair tier names:** Confirmed working set above — pending final sign-off
- **Logarithmic weight formula:** Exact formula to be decided at implementation time (candidate: `weight = 1 + log2(tokenBalance + 1)`)
- **Token burn on strike 2+:** Does each subsequent strike beyond 2 (before blacklist) burn another token, or is 1 burn + blacklist the ceiling?
