# Merkle Proof Demonstration

A Merkle tree commits to a list of leaves by repeatedly hashing pairs of nodes
until one root remains. A Merkle proof shows that a selected leaf belongs to the
tree without sending every other leaf.

## What the visualizer shows

- leaf parsing
- leaf hashes
- parent node hashing
- odd-node duplication
- tree levels
- selected proof path
- sibling position
- proof verification
- root recomputation

## How verification works

1. Start with the selected leaf hash.
2. Read each proof sibling.
3. Preserve whether the sibling belongs on the left or right.
4. Hash the ordered pair.
5. Repeat until a root is produced.
6. Compare the produced root with the expected Merkle root.

## Security note

The page uses a deterministic toy hash for education. Production Merkle trees
should use secure hashes such as SHA-256 or another domain-appropriate hash.

## Manual testing

1. Open `/visualizer/merkle-proof`.
2. Confirm the default leaves build a visible tree.
3. Select different leaves and confirm the proof path updates.
4. Confirm the root remains stable for unchanged leaves.
5. Add a fifth leaf and confirm odd-node duplication appears.
6. Edit one leaf and confirm the root changes.
7. Clear all but one leaf and confirm validation appears.
8. Resize to mobile width and confirm the page remains usable.
