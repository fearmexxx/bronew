import type { Contract } from "starknet";

type ViewContract = Pick<Contract, "call">;

/**
 * Starknet.js v10 requires call options to be passed to Contract.call(), not
 * appended to a generated ABI method where they are mistaken for calldata.
 */
export const callLatest = <T = unknown>(
  contract: ViewContract,
  method: string,
  args: unknown[] = [],
): Promise<T> => contract.call(method, args as any[], { blockIdentifier: "latest" }) as Promise<T>;
