export interface SendParams {
  to: string;
  amount: string;
  private?: boolean;
  token?: string;
}

export interface ReceiveParams {
  domain: string;
  private?: boolean;
}

export interface IdentityResponse {
  name: string;
  identity_address: string;
  wallets: string[];
  agents: any[];
  privacy_enabled: boolean;
  shielded_balance: string;
  credentials_count: number;
  metadata?: any;
}

export interface ContractCall {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a positive decimal number');
  }
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places`);
  }
  const value = BigInt(whole) * (10n ** BigInt(decimals))
    + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals));
  if (value <= 0n) throw new Error('Amount must be greater than zero');
  return value;
}

export class Brother {
  public solverUrl: string;
  public identityContractAddress: string;
  public strkTokenAddress: string;

  constructor(
    solverUrl: string = 'http://localhost:3001',
    identityContractAddress: string = '0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e',
    strkTokenAddress: string = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  ) {
    this.solverUrl = solverUrl.replace(/\/$/, '');
    this.identityContractAddress = identityContractAddress;
    this.strkTokenAddress = strkTokenAddress;
  }

  private requireEscrowAddress(): void {
    if (!/^0x[0-9a-fA-F]+$/.test(this.identityContractAddress) || BigInt(this.identityContractAddress) === 0n) {
      throw new Error('A deployed secured IdentityContract address is required');
    }
  }

  /**
   * Resolves a .real name to primary address.
   * @param name The .real domain name
   */
  async resolve(name: string): Promise<string | null> {
    try {
      const clean = name.replace(/\.real$/, '');
      const response = await fetch(`${this.solverUrl}/v1/resolve?name=${encodeURIComponent(clean)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.address || null;
    } catch (error) {
      console.error('BrotherSDK: Error resolving domain:', error);
      return null;
    }
  }

  /**
   * Reverse resolves a wallet address to its primary .real identity.
   * @param walletAddress The Starknet wallet address
   */
  async login(walletAddress: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.solverUrl}/v1/reverse?address=${encodeURIComponent(walletAddress)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.name || data.domain || null;
    } catch (error) {
      console.error('BrotherSDK: Error fetching identity for wallet:', error);
      return null;
    }
  }

  /**
   * Fetches full identity state (wallets, privacy, shielded balance, text records)
   * @param name The .real domain name
   */
  async getIdentity(name: string): Promise<IdentityResponse | null> {
    try {
      const clean = name.replace(/\.real$/, '');
      const response = await fetch(`${this.solverUrl}/v1/identity?name=${encodeURIComponent(clean)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('BrotherSDK: Error fetching identity:', error);
      return null;
    }
  }

  /**
   * Prepares an atomic approve-and-deposit multicall for the STRK escrow pool.
   * @param amountEth Amount of STRK (in human-readable ether format, e.g. "10")
   */
  buildShieldCalls(amountEth: string): ContractCall[] {
    this.requireEscrowAddress();
    const wei = parseTokenAmount(amountEth);
    const low = (wei & ((1n << 128n) - 1n)).toString();
    const high = (wei >> 128n).toString();

    return [
      {
        contractAddress: this.strkTokenAddress,
        entrypoint: 'approve',
        calldata: [this.identityContractAddress, low, high],
      },
      {
        contractAddress: this.identityContractAddress,
        entrypoint: 'enable_privacy',
        calldata: ['1'],
      },
      {
        contractAddress: this.identityContractAddress,
        entrypoint: 'deposit',
        calldata: [low, high],
      },
    ];
  }

  /**
   * Prepares on-chain call to unshield (withdraw) STRK from escrow pool.
   * @param amountEth Amount of STRK to withdraw
   */
  buildWithdrawCall(amountEth: string): ContractCall {
    this.requireEscrowAddress();
    const wei = parseTokenAmount(amountEth);
    const low = (wei & ((1n << 128n) - 1n)).toString();
    const high = (wei >> 128n).toString();

    return {
      contractAddress: this.identityContractAddress,
      entrypoint: 'withdraw',
      calldata: [low, high],
    };
  }

  /**
   * Prepares on-chain call to execute a private transfer from escrow pool to a recipient address.
   * @param recipientAddress Recipient Starknet contract address
   * @param amountEth Amount of STRK
   */
  buildPrivateSendCall(recipientAddress: string, amountEth: string): ContractCall {
    this.requireEscrowAddress();
    if (!/^0x[0-9a-fA-F]+$/.test(recipientAddress) || BigInt(recipientAddress) === 0n) {
      throw new Error('Recipient must be a non-zero Starknet address');
    }
    const wei = parseTokenAmount(amountEth);
    const low = (wei & ((1n << 128n) - 1n)).toString();
    const high = (wei >> 128n).toString();

    return {
      contractAddress: this.identityContractAddress,
      entrypoint: 'private_send',
      calldata: [recipientAddress, low, high],
    };
  }
}

export const brother = new Brother();
export default brother;
