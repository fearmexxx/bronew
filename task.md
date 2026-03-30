# Brother ID Improvement Tasks

Based on a comparative analysis with ENS (Ethereum Name Service) and Starknet ID, as well as 2025 blockchain identity trends, the following tasks are proposed to elevate Brother ID to a competitive, full-featured identity protocol.

## Phase 1: Rich Identity & Records (Core Value Proposition)
**Goal:** Move beyond simple address resolution to full "Identity profiles" (Avatars, Socials, Websites).

- [x] **Contract: Implement Flexible Text Records**
    - Current state: `DomainDetails` only stores a `resolver` address.
    - Task: Add a generic key-value store (Map<felt252, Map<felt252, felt252>>) or a separate `Resolver` contract to support standard keys:
        - `avatar`: URL to an NFT image.
        - `description`: User bio.
        - `twitter`, `discord`, `telegram`: Social handles.
        - `url`: Personal website.
- [x] **Contract: Multichain Address Support**
    - Task: Allow storing addresses for other chains (BTC, ETH, SOL) so Brother ID can be a universal payment username.
- [x] **Frontend: Profile Editor UI**
    - Task: Create a comprehensive "Edit Profile" page to manage these new text records.
    - Task: Add a visual preview of the "Brother ID Profile Card".

## Phase 2: Advanced Domain Management (Security & Composability)
**Goal:** Enable robust subname use cases (community issuance, renting) via permission management.

- [x] **Contract: Name Wrapper & Fuses**
    - Inspiration: ENS Name Wrapper.
    - Task: Implement "Fuses" (permissions) that can be burned (irrevocably revoked) by the parent domain owner upon subdomain creation.
        - `CANNOT_UNWRAP`: Locks the name in the wrapper.
        - `CANNOT_TRANSFER`: Soulbound tokens (good for badges/credentials).
        - `CANNOT_SET_RESOLVER`: User controls the name but not where it points.
- [x] **Contract: Expiry & Grace Periods**
    - Task: Ensure the renewal/expiry logic includes a "Grace Period" (e.g., 90 days) where the owner can still renew before it goes to auction, preventing accidental loss.

## Phase 3: Social & Verification
**Goal:** Establish trust and link on-chain identity with off-chain reputation.

- [x] **Integration: Social Verification Oracle**
    - Task: Implement a mechanism (Chainlink or custom oracle) to verify ownership of Web2 accounts (Twitter/X).
    - Output: A "Verified" checkmark on the frontend profile.
- [x] **Frontend: "Login with Brother ID"**
    - Task: Create a simple SDK/Button component that other dApps can drop in to resolve user addresses and avatars from their Brother ID.

## Phase 4: Infrastructure & Performance
**Goal:** Ensure scalability and fast load times.

- [x] **Indexer Integration (Apibara / Envio)**
    - Current state: Frontend relies on RPC calls (`get_domains_of`). This is slow for large collections.
    - Task: Build a subgraph/indexer to cache domain events (`DomainRegistered`, `Transfer`) for instant profile loading and activity feeds.
- [x] **Metadata Service**
    - Task: Improve `token_uri` generation. Currently supports basic parts. Consider an on-chain SVG generator contract so NFTs render beautifully on marketplaces (Element, Aspect) without centralized APIs.

## Phase 5: UI/UX Refinement
**Goal:** Professionalize the "Cyberpunk" aesthetic for mass adoption.

- [ ] **UX: Global Activity Feed**
    - Task: Show a ticker of "Just Registered" or "High Bid" domains to create liveliness on the landing page.
- [ ] **UX: Registration Wizard**
    - Task: Simplify the registration modal into a step-by-step wizard: Search -> Select Years -> Add Records (Optional) -> Mint.
