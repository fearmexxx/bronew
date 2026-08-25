import { Brother, brother, parseTokenAmount } from '../index';

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

  it.each(['0', '-1', 'NaN', '1.0000000000000000001'])('rejects invalid amount %s', (amount) => {
    expect(() => parseTokenAmount(amount)).toThrow();
  });

  it('fails closed when the secured escrow address is not configured', () => {
    const unconfigured = new Brother('http://localhost:3001', '0x0');
    expect(() => unconfigured.buildShieldCalls('1')).toThrow('secured IdentityContract');
  });
});
