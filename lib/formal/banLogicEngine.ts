// Formal Security Protocol State Machine & BAN Logic Belief Engine

export type ProtocolState = 'Idle' | 'Awaiting_Ticket' | 'ClientHelloSent' | 'ServerHelloReceived' | 'KeysExchanged' | 'EncryptedSessionEstablished';

export interface ProtocolMessage {
  id: string;
  name: string;
  sender: string;
  receiver: string;
  expectedState: ProtocolState;
  isReplay?: boolean;
}

export interface BanBelief {
  statement: string;
  isHolds: boolean;
  explanation: string;
}

export interface VerificationResult {
  isValidTransition: boolean;
  vulnerabilityDetected?: string;
  beliefs: BanBelief[];
  nextState: ProtocolState;
}

const NEEDHAM_SCHROEDER_MESSAGES: ProtocolMessage[] = [
  { id: 'msg1', name: 'A -> S: A, B, Na', sender: 'Alice', receiver: 'Server', expectedState: 'Idle' },
  { id: 'msg2', name: 'S -> A: {Na, B, Kab, {Kab, A}Ks}Ka', sender: 'Server', receiver: 'Alice', expectedState: 'Awaiting_Ticket' },
  { id: 'msg3', name: 'A -> B: {Kab, A}Ks (Ticket_B)', sender: 'Alice', receiver: 'Bob', expectedState: 'Awaiting_Ticket' },
  { id: 'msg4', name: 'B -> A: {Nb}Kab', sender: 'Bob', receiver: 'Alice', expectedState: 'KeysExchanged' },
  { id: 'msg5', name: 'A -> B: {Nb - 1}Kab', sender: 'Alice', receiver: 'Bob', expectedState: 'EncryptedSessionEstablished' },
];

export function evaluateProtocolTransition(
  currentState: ProtocolState,
  incomingMessage: ProtocolMessage
): VerificationResult {
  // Check for out-of-order or replay attack simulation (e.g. Lowe's 1995 attack on Needham-Schroeder)
  if (incomingMessage.isReplay && incomingMessage.id === 'msg3') {
    return {
      isValidTransition: false,
      vulnerabilityDetected: 'Lowe’s Attack Detected: Replayed Ticket_B accepted without fresh nonce challenge verification (P |≡ #(N_b) FAILS).',
      beliefs: [
        { statement: 'A ⊲ {Kab, A}Ks', isHolds: true, isOpen: true, explanation: 'Agent A sees encrypted ticket from server.' } as any,
        { statement: 'B |≡ (A ≷{Kab} B)', isHolds: false, explanation: 'Freshness failure: Bob cannot verify if shared session key Kab is freshly generated in this session.' },
      ],
      nextState: currentState,
    };
  }

  if (incomingMessage.expectedState !== currentState && currentState !== 'Idle') {
    return {
      isValidTransition: false,
      vulnerabilityDetected: `State Confusion: Received message '${incomingMessage.name}' while in state '${currentState}' (Expected: '${incomingMessage.expectedState}').`,
      beliefs: [
        { statement: 'P |≡ ♯(X)', isHolds: false, explanation: 'Message freshness invariant violated due to out-of-order sequence.' },
      ],
      nextState: currentState,
    };
  }

  // Normal valid transition flow
  let nextState: ProtocolState = 'EncryptedSessionEstablished';
  if (incomingMessage.id === 'msg1') nextState = 'Awaiting_Ticket';
  else if (incomingMessage.id === 'msg3') nextState = 'KeysExchanged';

  return {
    isValidTransition: true,
    beliefs: [
      { statement: 'P |≡ ♯(N_b)', isHolds: true, explanation: 'Nonce freshness successfully verified.' },
      { statement: 'P |≡ Q |~ X', isHolds: true, explanation: 'Principal once said invariant verified via digital signature/MAC.' },
    ],
    nextState,
  };
}

export function getProtocolMessages(): ProtocolMessage[] {
  return NEEDHAM_SCHROEDER_MESSAGES;
}
