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

export class Brother {
  public solverUrl: string;
  public identityContractAddress: string;
  public strkTokenAddress: string;

  constructor(
    solverUrl: string = 'http://localhost:3001',
    identityContractAddress: string = '0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd',
    strkTokenAddress: string = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  ) {
    this.solverUrl = solverUrl.replace(/\/$/, '');
    this.identityContractAddress = identityContractAddress;
    this.strkTokenAddress = strkTokenAddress;
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
   * Prepares on-chain multicall to shield STRK tokens into the privacy escrow pool.
   * @param amountEth Amount of STRK (in human-readable ether format, e.g. "10")
   */
  buildShieldCalls(amountEth: string): ContractCall[] {
    const wei = BigInt(Math.floor(parseFloat(amountEth) * 1e18));
    const low = (wei & ((1n << 128n) - 1n)).toString();
    const high = (wei >> 128n).toString();

    return [
      {
        contractAddress: this.strkTokenAddress,
        entrypoint: 'transfer',
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
    const wei = BigInt(Math.floor(parseFloat(amountEth) * 1e18));
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
    const wei = BigInt(Math.floor(parseFloat(amountEth) * 1e18));
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
