const fs = require("fs");
const path = require("path");
const { Account, RpcProvider, json, CallData } = require("../client1/node_modules/starknet");

const RPC_URL = process.env.STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia";
const provider = new RpcProvider({ nodeUrl: RPC_URL });

// Read account details from starkli-wallets/account.json
const accountConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "starkli-wallets/account.json"), "utf8"));
const keystore = JSON.parse(fs.readFileSync(path.join(__dirname, "starkli-wallets/keystore.json"), "utf8"));

// We will use starkli with RPC v0.7 endpoint override for deployment
console.log("Account Config:", accountConfig);
