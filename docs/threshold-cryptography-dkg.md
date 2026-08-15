# Threshold Cryptography & Distributed Key Generation (DKG)

Threshold Cryptography allows a group of participants to share a secret key such that any subset of $t$ participants (the threshold) can collaboratively perform cryptographic operations (like signing or decrypting), but fewer than $t$ participants can do nothing. 

Distributed Key Generation (DKG) is a protocol that generates this shared secret key without ever constructing it in a single place. No single party, not even a "trusted dealer", ever knows the full secret.

## Mathematical Foundation

Our implementation demonstrates the core principles of DKG and Threshold Signatures using:
1. **Shamir's Secret Sharing (SSS):** Over the scalar field of secp256k1.
2. **Pedersen-style Commitments:** Allowing participants to verify their shares without revealing them.
3. **Classic Schnorr Signatures:** Simplified from BIP340 to keep the interpolation logic pure for educational purposes.

### 1. Distributed Key Generation (DKG)

Instead of a single dealer, every participant acts as a dealer for their own random secret.

1. **Polynomial Generation:** Each participant $i$ generates a random polynomial of degree $t-1$:
   $$f_i(x) = a_{i,0} + a_{i,1}x + a_{i,2}x^2 + \dots + a_{i,t-1}x^{t-1} \pmod n$$
   where $n$ is the secp256k1 curve order. The participant's secret contribution is $a_{i,0}$.

2. **Commitments:** Participant $i$ broadcasts commitments to the coefficients of their polynomial:
   $$C_{i,k} = a_{i,k} \cdot G$$
   where $G$ is the generator point.

3. **Share Distribution:** Participant $i$ sends a private share $s_{i,j} = f_i(j) \pmod n$ to every other participant $j$.

4. **Share Verification:** Participant $j$ verifies the received share using the broadcasted commitments:
   $$s_{i,j} \cdot G \stackrel{?}{=} \sum_{k=0}^{t-1} (j^k \cdot C_{i,k})$$

5. **Aggregation:** If all shares are valid, participant $j$ computes their final secret share $s_j$ by summing all received shares:
   $$s_j = \sum_{i=1}^N s_{i,j} \pmod n$$

The implicit group secret is $x = \sum_{i=1}^N a_{i,0} \pmod n$. 
The group public key is $X = \sum_{i=1}^N C_{i,0} = x \cdot G$.

*Crucially, no one knows $x$, but everyone knows their share $s_j$ and the group public key $X$.*

### 2. Threshold Schnorr Signing

To sign a message $M$, a subset of $t$ participants collaborate.

1. **Ephemeral Secrets:** Each participant $j$ in the signing subset generates a random ephemeral secret $k_j$ and broadcasts $R_j = k_j \cdot G$.
2. **Aggregated R:** The group aggregates the public nonces: $R = \sum R_j$.
3. **Challenge:** The challenge is computed as $c = H(R \parallel X \parallel M)$.
4. **Partial Signatures:** Each participant computes a partial signature using their secret share $s_j$, their ephemeral secret $k_j$, the challenge $c$, and their Lagrange interpolation coefficient $\lambda_j$:
   $$z_j = k_j + c \cdot \lambda_j \cdot s_j \pmod n$$
   where $\lambda_j = \prod_{m \in S, m \neq j} \frac{m}{m - j} \pmod n$.
5. **Aggregation and Verification:** The partial signatures are summed to create the final signature $z = \sum z_j \pmod n$. 
   The signature $(R, z)$ is valid if:
   $$z \cdot G \stackrel{?}{=} R + c \cdot X$$

## Educational Simplifications

To make the mathematics as clear as possible, this simulator makes the following simplifications compared to a production system (like FROST):

- **Classic Schnorr vs BIP340:** We use "Classic Schnorr" where verification is $zG = R + cX$. BIP340 (used in Bitcoin) requires $R$ to have an even Y-coordinate. If $R$ is odd, the secret nonce $k$ must be negated. In a threshold setting, negating $k$ *after* generating $R$ requires a round of agreement among participants, adding significant complexity to the protocol.
- **Round Complexity:** The simulator collapses network rounds. In reality, DKG requires multiple rounds of broadcast and secure point-to-point communication.
- **Malicious Participants:** We assume participants are "honest-but-curious". A production DKG needs mechanisms to evict participants who send invalid shares or partial signatures (e.g., Feldman VSS complaints).

## Usage in CryptoViz

The interactive simulator allows you to:
1. Define the number of participants ($n$) and the threshold ($t$).
2. Run the DKG to see the resulting polynomial coefficients, commitments, and final shares.
3. Select any $t$ participants to collaboratively generate a signature for a custom message.
4. Verify the final signature against the aggregated group public key.
