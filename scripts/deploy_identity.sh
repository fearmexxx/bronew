#!/bin/bash
# ============================================================================
# Brother Protocol v2 — IdentityContract Deployment Script (Starknet Sepolia)
# ============================================================================
#
# Prerequisites:
#   1. Install starkli: curl https://get.starkli.sh | sh
#   2. Set up a Starknet account (Argent X or Braavos on Sepolia)
#   3. Export your account and keystore:
#        starkli account fetch <ACCOUNT_ADDRESS> --network sepolia --output account.json
#        starkli signer keystore from-key keystore.json
#
# Usage:
#   chmod +x deploy_identity.sh
#   ./deploy_identity.sh
# ============================================================================

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────────
NETWORK="sepolia"
RPC_URL="${STARKNET_RPC_URL:-https://api.cartridge.gg/x/starknet/sepolia}"
ACCOUNT_FILE="${STARKNET_ACCOUNT:-./account.json}"
KEYSTORE_FILE="${STARKNET_KEYSTORE:-./keystore.json}"

# The owner address for the IdentityContract (your wallet address)
OWNER_ADDRESS="${OWNER_ADDRESS:-}"
STRK_TOKEN_ADDRESS="${STRK_TOKEN_ADDRESS:-0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d}"

# Path to compiled contract artifacts
CONTRACT_DIR="../contracts/brotherdomain/target/dev"
IDENTITY_SIERRA="${CONTRACT_DIR}/brother_identity_IdentityContract.contract_class.json"
IDENTITY_CASM="${CONTRACT_DIR}/brother_identity_IdentityContract.compiled_contract_class.json"

# ─── Validation ────────────────────────────────────────────────────────────────
echo "🔷 Brother Protocol v2 — IdentityContract Deployment"
echo "   Network : ${NETWORK}"
echo "   RPC     : ${RPC_URL}"
echo ""

if [ ! -f "$IDENTITY_SIERRA" ]; then
    echo "❌ Sierra artifact not found at: $IDENTITY_SIERRA"
    echo "   Run 'scarb build' in contracts/brotherdomain first."
    exit 1
fi

if [ -z "$OWNER_ADDRESS" ]; then
    echo "❌ OWNER_ADDRESS not set. Export it before running:"
    echo "   export OWNER_ADDRESS=0xYourWalletAddress"
    exit 1
fi

if [ ! -f "$ACCOUNT_FILE" ]; then
    echo "❌ Account file not found: $ACCOUNT_FILE"
    echo "   Run: starkli account fetch <ADDRESS> --network sepolia --output account.json"
    exit 1
fi

# ─── Step 1: Declare the contract class ────────────────────────────────────────
echo "📦 Step 1: Declaring IdentityContract class..."
CLASS_HASH=$(starkli declare \
    --rpc "$RPC_URL" \
    --account "$ACCOUNT_FILE" \
    --keystore "$KEYSTORE_FILE" \
    --watch \
    "$IDENTITY_SIERRA" \
    "$IDENTITY_CASM" \
    2>&1 | grep -oE '0x[0-9a-f]+' | tail -1)

echo "   ✅ Class Hash: $CLASS_HASH"

# ─── Step 2: Deploy the contract ──────────────────────────────────────────────
echo ""
echo "🚀 Step 2: Deploying IdentityContract with owner=${OWNER_ADDRESS}..."
DEPLOY_OUTPUT=$(starkli deploy \
    --rpc "$RPC_URL" \
    --account "$ACCOUNT_FILE" \
    --keystore "$KEYSTORE_FILE" \
    --watch \
    "$CLASS_HASH" \
    "$OWNER_ADDRESS" \
    "$STRK_TOKEN_ADDRESS" \
    2>&1)

CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[0-9a-f]+' | tail -1)

echo "   ✅ Contract Address: $CONTRACT_ADDRESS"

# ─── Step 3: Output summary ───────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  IdentityContract Deployed Successfully!"
echo "═══════════════════════════════════════════════════════════"
echo "  Network          : ${NETWORK}"
echo "  Class Hash       : ${CLASS_HASH}"
echo "  Contract Address : ${CONTRACT_ADDRESS}"
echo "  Owner            : ${OWNER_ADDRESS}"
echo "  STRK Token       : ${STRK_TOKEN_ADDRESS}"
echo ""
echo "  Next steps:"
echo "    1. Update solver-service/.env with:"
echo "       IDENTITY_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}"
echo ""
echo "    2. Update client1/.env with:"
echo "       VITE_IDENTITY_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}"
echo ""
echo "    3. Verify on Voyager:"
echo "       https://sepolia.voyager.online/contract/${CONTRACT_ADDRESS}"
echo "═══════════════════════════════════════════════════════════"
