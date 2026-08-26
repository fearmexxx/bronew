import {
  Brother,
  buildStrk20Deposit,
  buildStrk20Transfer,
  buildStrk20Withdraw,
  parseTokenAmount,
  supportsStrk20Spec,
} from '../index';

describe('Brother Protocol SDK', () => {
  const configured = new Brother(
    'http://localhost:3001',
    '0x1234',
  );
  it('should initialize with default testnet parameters', () => {
    const instance = new Brother();
    expect(instance.solverUrl).toBe('http://localhost:3001');
    expect(instance.identityContractAddress).toBe('0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e');
  });

  it('should format shield calls correctly for multicall', () => {
    const calls = configured.buildShieldCalls('10');
    expect(calls).toHaveLength(3);
    
    // Call 1: approval; deposit() performs transfer_from atomically.
    expect(calls[0].entrypoint).toBe('approve');
    expect(calls[0].calldata[0]).toBe(configured.identityContractAddress);
    
    // Call 2: Enable privacy
    expect(calls[1].entrypoint).toBe('enable_privacy');
    
    // Call 3: Deposit to pool
    expect(calls[2].entrypoint).toBe('deposit');
  });

  it('should format withdraw calls correctly', () => {
    const call = configured.buildWithdrawCall('5');
    expect(call.entrypoint).toBe('withdraw');
    expect(call.contractAddress).toBe(configured.identityContractAddress);
    expect(call.calldata.length).toBe(2); // low, high
  });

  it('should format private send calls with recipient address', () => {
    const recipient = '0x0584afe76109dcb6b6b00614f7c05892331092a5b32655332f1a65baed8bf2bd';
    const call = configured.buildPrivateSendCall(recipient, '2.5');
    expect(call.entrypoint).toBe('private_send');
    expect(call.contractAddress).toBe(configured.identityContractAddress);
    expect(call.calldata[0]).toBe(recipient);
  });

  it('parses token amounts without floating-point precision loss', () => {
    expect(parseTokenAmount('1.000000000000000001')).toBe(1000000000000000001n);
    expect(parseTokenAmount('0.5')).toBe(500000000000000000n);
  });

  it('builds Wallet API v0.10.3 actions', () => {
    expect(buildStrk20Deposit('0x1', '1')).toEqual({ type: 'deposit', token: '0x1', amount: '0xde0b6b3a7640000' });
    expect(buildStrk20Withdraw('0x1', '0.5', '0x2')).toEqual({
      type: 'withdraw', token: '0x1', amount: '0x6f05b59d3b20000', recipient: '0x2',
    });
    expect(buildStrk20Transfer('0x1', '2', '0x2')).toEqual({
      type: 'transfer', token: '0x1', amount: '0x1bc16d674ec80000', recipient: '0x2',
    });
  });

  it('delegates private state and proving to the wallet', async () => {
    const wallet = {
      strk20Balances: jest.fn().mockResolvedValue([{ token: '0x1', balance: '0x10' }]),
      strk20PrepareInvoke: jest.fn().mockResolvedValue({}),
      strk20InvokeTransaction: jest.fn().mockResolvedValue({ transaction_hash: '0xabc' }),
    };
    await configured.getPrivateBalances(wallet, ['0x1']);
    await configured.shield(wallet, '1', '0x1');
    await configured.unshield(wallet, '0.5', '0x2', '0x1');
    await configured.privateTransfer(wallet, '2', '0x2', '0x1');
    expect(wallet.strk20Balances).toHaveBeenCalledWith(['0x1']);
    expect(wallet.strk20InvokeTransaction).toHaveBeenCalledTimes(3);
  });

  it.each(['0.10.3', '0.10.4-rc.1', '0.11.0', '1.0.0'])('accepts supported spec %s', (version) => {
    expect(supportsStrk20Spec(version)).toBe(true);
  });

  it.each(['0', '-1', 'NaN', '1.0000000000000000001'])('rejects invalid amount %s', (amount) => {
    expect(() => parseTokenAmount(amount)).toThrow();
  });

  it('fails closed when the secured escrow address is not configured', () => {
    const unconfigured = new Brother('http://localhost:3001', '0x0');
    expect(() => unconfigured.buildShieldCalls('1')).toThrow('secured IdentityContract');
  });
});
