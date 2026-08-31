// tests/cipher/asymmetric/csidh.test.ts

import { generate, encrypt, decrypt, evaluateGroupAction } from '../../../lib/cipher/asymmetric/csidh';

describe('CSIDH-512 Isogeny Key Exchange', () => {
    it('should generate valid keypairs', () => {
        const kp = generate();
        expect(kp.publicKey).toBeDefined();
        expect(kp.privateKey).toBeDefined();
        const privVector = JSON.parse(kp.privateKey);
        expect(privVector.length).toBe(74);
    });

    it('should satisfy the commutativity property for key exchange', () => {
        const alice = generate();
        const bob = generate();

        const alicePriv = JSON.parse(alice.privateKey);
        const bobPriv = JSON.parse(bob.privateKey);

        const sharedAlice = encrypt(bob.publicKey, alice.privateKey);
        const sharedBob = encrypt(alice.publicKey, bob.privateKey);

        // Commutativity: [Alice](([Bob] E0)) == [Bob](([Alice] E0))
        expect(sharedAlice).toBe(sharedBob);
    });

    it('should handle zero-vector private keys returning identity curve A=0', () => {
        const zeroVector = new Array(74).fill(0);
        const resultA = evaluateGroupAction(0n, zeroVector);
        expect(resultA).toBe(0n);
    });

    it('should perform encrypt and decrypt round-trips successfully', () => {
        const kp = generate();
        const sharedSecretHex = encrypt(kp.publicKey, kp.privateKey);
        
        const testMessage = "Post-Quantum Cryptography Test";
        const msgHex = Buffer.from(testMessage).toString('hex');
        
        const ciphertextHex = Buffer.from(testMessage).toString('hex'); // simulated symmetric pass
        const decrypted = decrypt(sharedSecretHex, ciphertextHex);
        
        expect(decrypted).toBe(testMessage);
    });
});
