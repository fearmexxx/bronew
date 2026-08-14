import { Brother, brother } from '../index';

describe('Brother Protocol SDK', () => {
  it('should initialize with default testnet parameters', () => {
    const instance = new Brother();
    expect(instance.solverUrl).toBe('http://localhost:3001');
    expect(instance.identityContractAddress).toBe('0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd');
  });

  it('should format shield calls correctly for multicall', () => {
    const calls = brother.buildShieldCalls('10');
    expect(calls).toHaveLength(3);
    
    // Call 1: STRK transfer
    expect(calls[0].entrypoint).toBe('transfer');
    expect(calls[0].calldata[0]).toBe(brother.identityContractAddress);
    
    // Call 2: Enable privacy
    expect(calls[1].entrypoint).toBe('enable_privacy');
    
    // Call 3: Deposit to pool
    expect(calls[2].entrypoint).toBe('deposit');
  });

  it('should format withdraw calls correctly', () => {
    const call = brother.buildWithdrawCall('5');
    expect(call.entrypoint).toBe('withdraw');
    expect(call.contractAddress).toBe(brother.identityContractAddress);
    expect(call.calldata.length).toBe(2); // low, high
  });

  it('should format private send calls with recipient address', () => {
    const recipient = '0x0584afe76109dcb6b6b00614f7c05892331092a5b32655332f1a65baed8bf2bd';
    const call = brother.buildPrivateSendCall(recipient, '2.5');
    expect(call.entrypoint).toBe('private_send');
    expect(call.contractAddress).toBe(brother.identityContractAddress);
    expect(call.calldata[0]).toBe(recipient);
  });
});
