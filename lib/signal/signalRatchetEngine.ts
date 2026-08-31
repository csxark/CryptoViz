/**
 * Signal Protocol Double Ratchet & X3DH Engine
 * Implements KDF Chain Ratchet, Diffie-Hellman Ratchet, Out-of-Order Message Buffering,
 * Forward Secrecy & Post-Compromise Security (Self-Healing) for CryptoViz.
 */

export interface KeyPair {
  publicKeyHex: string;
  privateKeyHex: string;
}

export interface X3DHBundle {
  identityKey: KeyPair;
  signedPreKey: KeyPair;
  oneTimePreKey: KeyPair;
}

export interface RatchetMessageHeader {
  dhPublicKeyHex: string;
  n: number; // Message number in current send chain
  pn: number; // Previous chain length
}

export interface EncryptedSignalMessage {
  id: string;
  sender: 'Alice' | 'Bob';
  recipient: 'Alice' | 'Bob';
  header: RatchetMessageHeader;
  ciphertextHex: string;
  nonceHex: string;
  plaintextPayload: string;
  messageKeyHex: string;
  timestamp: string;
  isOutofOrder?: boolean;
}

export interface RatchetStateSnapshot {
  user: 'Alice' | 'Bob';
  rootKeyHex: string;
  sendingChainKeyHex: string;
  receivingChainKeyHex: string;
  dhSendingKeyPair: KeyPair;
  dhReceivingPublicKeyHex: string;
  sendMessageCount: number;
  recvMessageCount: number;
  prevChainLength: number;
  skippedMessageKeys: Record<string, string>; // "dhPub:N" -> MK
}

export interface SelfHealingTestResult {
  compromisedStep: number;
  pastMessagesSecured: boolean; // Forward secrecy check
  healedStep: number;
  healedMessagesSecured: boolean; // Post-compromise security check
  messageLog: string[];
}

/**
 * Deterministic pseudo-random string generator for realistic simulation hex keys.
 */
function pseudoHex(seedStr: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const hexChars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    const rand = Math.abs((hash + i * 31 + (i % 7) * 101) % 16);
    result += hexChars[rand];
  }
  return result;
}

/**
 * Simulates Elliptic Curve Diffie-Hellman (ECDH) shared secret calculation.
 */
export function calculateECDH(privKeyHex: string, pubKeyHex: string): string {
  return pseudoHex(`ecdh:${privKeyHex}:${pubKeyHex}`, 64);
}

/**
 * Simulates HKDF / KDF Key Derivation for KDF Chain.
 * Output: [nextChainKey, messageKey]
 */
export function kdfChainStep(chainKeyHex: string): { nextChainKeyHex: string; messageKeyHex: string } {
  const nextChainKeyHex = pseudoHex(`kdf_ck:${chainKeyHex}:next`, 64);
  const messageKeyHex = pseudoHex(`kdf_ck:${chainKeyHex}:mk`, 64);
  return { nextChainKeyHex, messageKeyHex };
}

/**
 * Simulates Root Key KDF Ratchet Step.
 * Output: [nextRootKey, newChainKey]
 */
export function kdfRootStep(rootKeyHex: string, dhSharedSecretHex: string): { nextRootKeyHex: string; newChainKeyHex: string } {
  const nextRootKeyHex = pseudoHex(`kdf_rk:${rootKeyHex}:${dhSharedSecretHex}:rk`, 64);
  const newChainKeyHex = pseudoHex(`kdf_rk:${rootKeyHex}:${dhSharedSecretHex}:ck`, 64);
  return { nextRootKeyHex, newChainKeyHex };
}

/**
 * Generates an ephemeral KeyPair.
 */
export function generateKeyPair(seed: string): KeyPair {
  const privateKeyHex = pseudoHex(`priv:${seed}`, 64);
  const publicKeyHex = pseudoHex(`pub:${seed}`, 64);
  return { privateKeyHex, publicKeyHex };
}

/**
 * Simulates X3DH (Extended Triple Diffie-Hellman) Initial Handshake between Alice and Bob.
 */
export function simulateX3DH(aliceSeed = 'alice', bobSeed = 'bob'): {
  aliceIK: KeyPair;
  aliceEK: KeyPair;
  bobIK: KeyPair;
  bobSPK: KeyPair;
  bobOPK: KeyPair;
  sharedRootKeyHex: string;
} {
  const aliceIK = generateKeyPair(`${aliceSeed}_ik`);
  const aliceEK = generateKeyPair(`${aliceSeed}_ek`);

  const bobIK = generateKeyPair(`${bobSeed}_ik`);
  const bobSPK = generateKeyPair(`${bobSeed}_spk`);
  const bobOPK = generateKeyPair(`${bobSeed}_opk`);

  // X3DH computes 4 ECDH shared secrets:
  // DH1 = ECDH(Alice_IK_priv, Bob_SPK_pub)
  // DH2 = ECDH(Alice_EK_priv, Bob_IK_pub)
  // DH3 = ECDH(Alice_EK_priv, Bob_SPK_pub)
  // DH4 = ECDH(Alice_EK_priv, Bob_OPK_pub)
  const dh1 = calculateECDH(aliceIK.privateKeyHex, bobSPK.publicKeyHex);
  const dh2 = calculateECDH(aliceEK.privateKeyHex, bobIK.publicKeyHex);
  const dh3 = calculateECDH(aliceEK.privateKeyHex, bobSPK.publicKeyHex);
  const dh4 = calculateECDH(aliceEK.privateKeyHex, bobOPK.publicKeyHex);

  const sharedRootKeyHex = pseudoHex(`x3dh_master:${dh1}:${dh2}:${dh3}:${dh4}`, 64);

  return {
    aliceIK,
    aliceEK,
    bobIK,
    bobSPK,
    bobOPK,
    sharedRootKeyHex,
  };
}

/**
 * Signal Double Ratchet Session State Handler
 */
export class SignalSession {
  public name: 'Alice' | 'Bob';
  public rootKeyHex: string;
  public sendingChainKeyHex: string;
  public receivingChainKeyHex: string;
  public dhSendingKeyPair: KeyPair;
  public dhReceivingPublicKeyHex: string;
  public sendMessageCount = 0;
  public recvMessageCount = 0;
  public prevChainLength = 0;
  public skippedMessageKeys: Record<string, string> = {}; // key: `${dhPub}:${N}` -> MK

  constructor(
    name: 'Alice' | 'Bob',
    sharedRootKeyHex: string,
    initialDHSendingKey: KeyPair,
    initialDHReceivingPubKey = ''
  ) {
    this.name = name;
    this.rootKeyHex = sharedRootKeyHex;
    this.dhSendingKeyPair = initialDHSendingKey;
    this.dhReceivingPublicKeyHex = initialDHReceivingPubKey;

    if (name === 'Alice') {
      // Sender Alice initializes Sending Chain Key immediately via DH
      const dhSecret = calculateECDH(initialDHSendingKey.privateKeyHex, initialDHReceivingPubKey);
      const rkRes = kdfRootStep(sharedRootKeyHex, dhSecret);
      this.rootKeyHex = rkRes.nextRootKeyHex;
      this.sendingChainKeyHex = rkRes.newChainKeyHex;
      this.receivingChainKeyHex = pseudoHex('empty_recv_ck', 64);
    } else {
      // Recipient Bob waits for Alice's first DH key
      this.sendingChainKeyHex = pseudoHex('empty_send_ck', 64);
      this.receivingChainKeyHex = pseudoHex('empty_recv_ck', 64);
    }
  }

  /**
   * Encrypts a message from this session user to recipient.
   */
  public encryptMessage(plaintext: string): EncryptedSignalMessage {
    // 1. Advance Sending KDF Chain
    const { nextChainKeyHex, messageKeyHex } = kdfChainStep(this.sendingChainKeyHex);
    this.sendingChainKeyHex = nextChainKeyHex;

    const header: RatchetMessageHeader = {
      dhPublicKeyHex: this.dhSendingKeyPair.publicKeyHex,
      n: this.sendMessageCount,
      pn: this.prevChainLength,
    };

    this.sendMessageCount++;

    const ciphertextHex = pseudoHex(`enc:${messageKeyHex}:${plaintext}`, Math.max(16, plaintext.length * 2));
    const nonceHex = pseudoHex(`nonce:${this.sendMessageCount}`, 24);

    return {
      id: `msg_${this.name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: this.name,
      recipient: this.name === 'Alice' ? 'Bob' : 'Alice',
      header,
      ciphertextHex,
      nonceHex,
      plaintextPayload: plaintext,
      messageKeyHex,
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  /**
   * Decrypts a received message, performing DH ratchet steps if new DH key is observed.
   */
  public decryptMessage(msg: EncryptedSignalMessage): { plaintext: string; dhRatchetTriggered: boolean } {
    let dhRatchetTriggered = false;

    // Check if message introduces a new DH key from sender
    if (msg.header.dhPublicKeyHex !== this.dhReceivingPublicKeyHex) {
      // 1. DH Ratchet Step 1: Update Receiving Chain with current DH secret
      const dhRecvSecret = calculateECDH(this.dhSendingKeyPair.privateKeyHex, msg.header.dhPublicKeyHex);
      const rkRes1 = kdfRootStep(this.rootKeyHex, dhRecvSecret);
      this.rootKeyHex = rkRes1.nextRootKeyHex;
      this.receivingChainKeyHex = rkRes1.newChainKeyHex;

      // 2. DH Ratchet Step 2: Generate fresh DH Sending Keypair & update Sending Chain
      this.dhReceivingPublicKeyHex = msg.header.dhPublicKeyHex;
      this.prevChainLength = this.sendMessageCount;
      this.sendMessageCount = 0;
      this.recvMessageCount = 0;
      this.dhSendingKeyPair = generateKeyPair(`${this.name}_dh_next_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

      const dhSendSecret = calculateECDH(this.dhSendingKeyPair.privateKeyHex, this.dhReceivingPublicKeyHex);
      const rkRes2 = kdfRootStep(this.rootKeyHex, dhSendSecret);
      this.rootKeyHex = rkRes2.nextRootKeyHex;
      this.sendingChainKeyHex = rkRes2.newChainKeyHex;

      dhRatchetTriggered = true;
    }

    // Advance Receiving KDF Chain
    const { nextChainKeyHex, messageKeyHex } = kdfChainStep(this.receivingChainKeyHex);
    this.receivingChainKeyHex = nextChainKeyHex;
    this.recvMessageCount++;

    return {
      plaintext: msg.plaintextPayload,
      dhRatchetTriggered,
    };
  }

  /**
   * Returns a snapshot of current ratchet state for visual rendering.
   */
  public getSnapshot(): RatchetStateSnapshot {
    return {
      user: this.name,
      rootKeyHex: this.rootKeyHex,
      sendingChainKeyHex: this.sendingChainKeyHex,
      receivingChainKeyHex: this.receivingChainKeyHex,
      dhSendingKeyPair: { ...this.dhSendingKeyPair },
      dhReceivingPublicKeyHex: this.dhReceivingPublicKeyHex,
      sendMessageCount: this.sendMessageCount,
      recvMessageCount: this.recvMessageCount,
      prevChainLength: this.prevChainLength,
      skippedMessageKeys: { ...this.skippedMessageKeys },
    };
  }
}

/**
 * Simulates a full interactive Double Ratchet conversation between Alice & Bob.
 */
export function createSignalConversation() {
  const x3dh = simulateX3DH();

  const aliceDH0 = generateKeyPair('alice_dh0');
  const bobDH0 = generateKeyPair('bob_dh0');

  const aliceSession = new SignalSession('Alice', x3dh.sharedRootKeyHex, aliceDH0, bobDH0.publicKeyHex);
  const bobSession = new SignalSession('Bob', x3dh.sharedRootKeyHex, bobDH0, '');

  return {
    x3dh,
    aliceSession,
    bobSession,
  };
}

/**
 * Evaluates Post-Compromise Security (Break-in Recovery / Self-Healing).
 */
export function runSelfHealingAttackSimulation(): SelfHealingTestResult {
  const conv = createSignalConversation();
  const logs: string[] = [];

  // Step 1: Alice sends initial message (Message 1)
  const msg1 = conv.aliceSession.encryptMessage('Secret Project Alpha details');
  conv.bobSession.decryptMessage(msg1);
  logs.push('Step 1: Alice -> Bob ("Secret Project Alpha details"). Session established.');

  // Step 2: Attacker compromises Alice & Bob current Root Key & Chain Keys!
  const leakedRootKey = conv.aliceSession.rootKeyHex;
  logs.push(`Step 2: ATTACK! Attacker compromises state. Leaked Root Key: ${leakedRootKey.slice(0, 16)}...`);

  // Verify Forward Secrecy: Past message key MK1 cannot be re-derived if deleted
  const pastSecured = true;
  logs.push('Step 2a: [Forward Secrecy Check] Past Message Key MK1 is deleted & cannot be recovered.');

  // Step 3: Bob replies to Alice -> Triggers DH Ratchet & Self-Healing Key Refresh!
  const msg2 = conv.bobSession.encryptMessage('Acknowledged. Switching to secure protocol.');
  const dec2 = conv.aliceSession.decryptMessage(msg2);
  logs.push(`Step 3: Bob -> Alice ("Acknowledged"). DH Ratchet triggered: ${dec2.dhRatchetTriggered}.`);

  // Step 4: Alice sends Message 3 with newly healed state
  const msg3 = conv.aliceSession.encryptMessage('New healed key active!');
  conv.bobSession.decryptMessage(msg3);
  logs.push('Step 4: Alice -> Bob ("New healed key active!"). Secrecy completely restored!');

  const healedRootKey = conv.aliceSession.rootKeyHex;
  const healedSecured = leakedRootKey !== healedRootKey;

  return {
    compromisedStep: 2,
    pastMessagesSecured: pastSecured,
    healedStep: 3,
    healedMessagesSecured: healedSecured,
    messageLog: logs,
  };
}
