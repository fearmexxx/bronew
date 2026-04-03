const express = require('express');
const cors = require('cors');
const { RpcProvider, Contract, shortString } = require('starknet');
require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/qXU4ta4yLmxUhIoLb-cZ7KtsNn808Pjw";
const BNS_CONTRACT_ADDRESS = "0x1031fbbf843f059e8c6c923a472458eb4384513c5fd087ca5054a56f4d9cf41";

// ABI for resolve_domain and get_primary_domain
const BNS_ABI = [
  { type: "function", name: "resolve_domain", inputs: [{ name: "domain", type: "core::felt252" }], outputs: [{ type: "core::starknet::contract_address::ContractAddress" }], state_mutability: "view" },
  { type: "function", name: "get_primary_domain", inputs: [{ name: "address", type: "core::starknet::contract_address::ContractAddress" }], outputs: [{ type: "core::felt252" }], state_mutability: "view" },
];

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const contract = new Contract(BNS_ABI, BNS_CONTRACT_ADDRESS, provider);

app.get('/', (req, res) => {
    res.json({ message: "Brother ID Solver Service Running" });
});

app.get('/resolve', async (req, res) => {
    try {
        const { domain } = req.query;
        if (!domain) {
            return res.status(400).json({ error: "Missing 'domain' query parameter." });
        }

        const cleanDomain = domain.toLowerCase().replace('.real', '');
        
        // Ensure max length for shortString is not exceeded
        if (cleanDomain.length > 31) {
            return res.status(400).json({ error: "Domain name too long (max 31 chars)." });
        }

        const domainEncoded = shortString.encodeShortString(cleanDomain);
        const resolvedAddress = await contract.call("resolve_domain", [domainEncoded], { blockIdentifier: 'latest' });
        
        let hexAddress = typeof resolvedAddress === 'bigint' 
            ? '0x' + resolvedAddress.toString(16) 
            : resolvedAddress.toString();
        
        if (hexAddress === '0x0') {
            return res.json({ domain, address: null, error: "Domain not registered or expired." });
        }

        return res.json({ domain, address: hexAddress, error: null });
    } catch (e) {
        console.error("Resolution error:", e);
        return res.status(500).json({ domain: req.query.domain, address: null, error: "Resolution failed. Ensure domain format is correct." });
    }
});

app.get('/reverse', async (req, res) => {
   try {
       const { address } = req.query;
       if (!address) {
            return res.status(400).json({ error: "Missing 'address' query parameter." });
       }

       const domainEncoded = await contract.call("get_primary_domain", [address], { blockIdentifier: 'latest' });
       
       if (domainEncoded.toString() === '0') {
            return res.json({ address, domain: null, error: "No primary domain set for this address." });
       }

       const decodedStr = shortString.decodeShortString(domainEncoded.toString());
       return res.json({ address, domain: decodedStr + '.real', error: null });

   } catch (e) {
       console.error("Reverse resolution error:", e);
       return res.status(500).json({ error: "Reverse resolution failed." });
   }
});

app.listen(PORT, () => {
    console.log(`Solver Service API running on port ${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET /resolve?domain=name.real`);
    console.log(`  GET /reverse?address=0x123...`);
});
