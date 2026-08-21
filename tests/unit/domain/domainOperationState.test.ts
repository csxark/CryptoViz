import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeDomainOperation,
  validateDomainInput,
  checkDomainAuthorization,
  verifyExternalEvidence,
  globalIdempotencyStore,
  AuthContext,
  DomainOperationInput,
} from '@/lib/domain/domainOperationState';

describe('Domain Operation State Engine (#1315)', () => {
  beforeEach(() => {
    globalIdempotencyStore.clear();
  });

  const adminAuth: AuthContext = {
    userId: 'admin_user_01',
    role: 'admin',
    permissions: ['*'],
  };

  const guestAuth: AuthContext = {
    userId: 'guest_user_01',
    role: 'guest',
    permissions: [],
  };

  describe('Input Validation', () => {
    it('rejects input missing operation name or idempotency key', () => {
      const val = validateDomainInput({
        category: 'arbitrage',
        operationName: '',
        payload: {},
        idempotencyKey: '',
      });
      expect(val.isValid).toBe(false);
    });

    it('validates category specific payload rules correctly', () => {
      // Arbitrage requires positive amountEth
      expect(
        validateDomainInput({
          category: 'arbitrage',
          operationName: 'Arb',
          payload: { amountEth: -5, dexA: 'uni', dexB: 'sushi' },
          idempotencyKey: 'k1',
        }).isValid
      ).toBe(false);

      // Bridge requires distinct source and target chains
      expect(
        validateDomainInput({
          category: 'bridge',
          operationName: 'Bridge',
          payload: { sourceChain: 'Eth', targetChain: 'Eth', amount: 10 },
          idempotencyKey: 'k2',
        }).isValid
      ).toBe(false);

      // Custody requires 0x hex destination address
      expect(
        validateDomainInput({
          category: 'custody',
          operationName: 'Withdrawal',
          payload: { asset: 'BTC', amount: 1, destinationAddress: 'invalid_addr' },
          idempotencyKey: 'k3',
        }).isValid
      ).toBe(false);
    });
  });

  describe('Authorization Checks', () => {
    it('grants access to admin and operators', () => {
      expect(checkDomainAuthorization('custody', adminAuth).authorized).toBe(true);
    });

    it('denies privileged operations to guest users', () => {
      const res = checkDomainAuthorization('custody', guestAuth);
      expect(res.authorized).toBe(false);
      expect(res.reason).toContain('Insufficient privileges');
    });
  });

  describe('Evidence Verification', () => {
    it('rejects production verification if evidence is missing', () => {
      const check = verifyExternalEvidence('arbitrage', undefined, false);
      expect(check.verified).toBe(false);
      expect(check.error).toContain('require verified external evidence');
    });

    it('verifies valid production evidence for bridge transfers', () => {
      const evidence = {
        sourceChainTx: '0x1111111111111111111111111111111111111111111111111111111111111111',
        targetChainTx: '0x2222222222222222222222222222222222222222222222222222222222222222',
      };
      expect(verifyExternalEvidence('bridge', evidence, false).verified).toBe(true);
    });

    it('requires simulation-* prefix for educational simulation evidence', () => {
      const invalidSimEvidence = {
        txHash: '0xprod_tx_hash',
      };
      const check = verifyExternalEvidence('arbitrage', invalidSimEvidence, true);
      expect(check.verified).toBe(false);
      expect(check.error).toContain('simulation-*');
    });
  });

  describe('Execution Engine & State Machine', () => {
    it('executes complete state machine happy path for educational simulation mode', async () => {
      const input: DomainOperationInput = {
        category: 'arbitrage',
        operationName: 'Flash Arbitrage',
        payload: { amountEth: 10, dexA: 'Uniswap', dexB: 'Sushiswap' },
        idempotencyKey: 'idemp-sim-001',
        isSimulation: true,
      };

      const res = await executeDomainOperation(input, { authContext: adminAuth });
      expect(res.state).toBe('COMPLETED');
      expect(res.isSimulation).toBe(true);
      expect(res.id).toContain('simulation-op-');
      expect(res.durablePersisted).toBe(true);
      expect(res.stateHistory.map((h) => h.state)).toEqual([
        'REQUESTED',
        'VALIDATING',
        'SUBMITTED_PENDING',
        'EXTERNALLY_VERIFIED',
        'PERSISTED',
        'COMPLETED',
      ]);
    });

    it('rejects execution when authorization fails', async () => {
      const input: DomainOperationInput = {
        category: 'custody',
        operationName: 'Vault Withdrawal',
        payload: { asset: 'BTC', amount: 2, destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
        idempotencyKey: 'idemp-unauth-001',
        isSimulation: true,
      };

      const res = await executeDomainOperation(input, { authContext: guestAuth });
      expect(res.state).toBe('REJECTED');
      expect(res.error).toContain('Insufficient privileges');
    });

    it('handles duplicate idempotency keys cleanly and detects payload conflicts', async () => {
      const input: DomainOperationInput = {
        category: 'yield',
        operationName: 'Distribute Yield',
        payload: { poolId: 'p1', totalDistributionUsd: 1000 },
        idempotencyKey: 'idemp-dup-001',
        isSimulation: true,
      };

      const res1 = await executeDomainOperation(input, { authContext: adminAuth });
      expect(res1.state).toBe('COMPLETED');

      // Duplicate request with identical payload returns cached result
      const res2 = await executeDomainOperation(input, { authContext: adminAuth });
      expect(res2.id).toBe(res1.id);

      // Conflict payload throws IDEMPOTENCY_CONFLICT
      const conflictInput: DomainOperationInput = {
        ...input,
        payload: { poolId: 'p1', totalDistributionUsd: 9999 },
      };

      await expect(executeDomainOperation(conflictInput, { authContext: adminAuth })).rejects.toThrow(
        'IDEMPOTENCY_CONFLICT'
      );
    });

    it('supports explicit terminal error states (EXPIRED, REJECTED, CANCELLED)', async () => {
      const input: DomainOperationInput = {
        category: 'rwa',
        operationName: 'Verify Reserve',
        payload: { assetId: 'gold_vault', custodian: 'Paxos', expectedReserveUsd: 5000 },
        idempotencyKey: 'idemp-expire-001',
        isSimulation: true,
      };

      const res = await executeDomainOperation(input, {
        authContext: adminAuth,
        simulateFailureState: 'EXPIRED',
      });

      expect(res.state).toBe('EXPIRED');
      expect(res.error).toContain('timed out / expired');
    });
  });
});
