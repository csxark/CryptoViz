// tests/unit/protocols/blindSignature.test.ts

import { 
    generateDemoRSAKey, 
    blindMessage, 
    signBlindedMessage, 
    unblindSignature, 
    verifySignature 
} from '../../../lib/protocols/blindSignature';

describe('Chaum RSA Blind Signatures Protocol', () => {
    const key = generateDemoRSAKey();

    it('should successfully complete the blind signature round-trip', () => {
        const message = 42n;
        const blindingFactor = 7n; // Coprime to n

        // 1. User blinds message
        const blinded = blindMessage(message, blindingFactor, key);
        expect(blinded).not.toBe(message);

        // 2. Signer signs blinded message (blind to message content)
        const blindedSig = signBlindedMessage(blinded, key);

        // 3. User unblinds signature
        const unblindedSig = unblindSignature(blindedSig, blindingFactor, key);

        // 4. Verification succeeds
        const isValid = verifySignature(message, unblindedSig, key);
        expect(isValid).toBe(true);
    });

    it('should fail verification if unblinded with an incorrect blinding factor', () => {
        const message = 42n;
        const correctR = 7n;
        const wrongR = 5n;

        const blinded = blindMessage(message, correctR, key);
        const blindedSig = signBlindedMessage(blinded, key);

        // Unblind with wrong factor
        const invalidSig = unblindSignature(blindedSig, wrongR, key);
        const isValid = verifySignature(message, invalidSig, key);

        expect(isValid).toBe(false);
    });
});
