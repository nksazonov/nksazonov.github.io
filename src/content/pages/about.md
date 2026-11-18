---
title: "About"
description: "Nikita Sazonov, a smart-contract and protocol engineer who designs and secures smart contracts that hold user funds."
---

I am Nikita Sazonov, a senior smart-contract and protocol engineer based in Prague. I design and secure smart contracts that hold user funds: from the state machine and its security rules, through the audit, to deployment on mainnet.

I came into blockchain in 2021 through an engineering training program, and was hired as a junior Solidity developer while still at university. What kept me there was debugging my first transaction through a state-channel protocol: every state and every signature had exactly one correct place. Since then I have been building systems where money can only move the way the rules allow.

## What I build

Most of my work is one of these:

- **Escrow:** contracts that hold funds until the parties agree how to split them.
- **Custody:** contracts that keep funds and release them only for an authorized withdrawal.
- **State channels:** two parties exchange signed balance updates off-chain and settle on-chain only at the end. If one side stops responding, the other can still exit through an on-chain challenge.
- **Cross-chain flows:** deposits on one chain, withdrawals on another, and keeping the balances consistent between them.

## Selected work

### Nitrolite v1: a cross-chain state-channel protocol (2025-2026)

I designed the protocol from scratch: the state machine, its security invariants (rules that must hold in every state, such as "funds move only on a state both parties signed") and the Solidity contracts. For disputes, I reused the idea of ForceMove, an earlier state-channel protocol. The contracts are deployed on 8 mainnets.

Links: [repository](https://github.com/layer-3/nitrolite) · [architecture diagram](https://github.com/layer-3/nitrolite/blob/main/docs/protocol/state_ledger_advancement.png) · [deployments](https://github.com/layer-3/nitrolite/tree/main/contracts/deployments)

### Taking a large security audit to its deadlines (2026)

As the de-facto tech lead of a small team, I ran the remediation of a full-stack Guardian audit of Nitrolite with about 100 findings. I triaged and split the findings, handled most disputes with the auditors, implemented fixes, and the team met the audit's deadlines. The engagement ended early, so there is no final report; the remediation pull requests are public.

Over the years, as the code owner, I have remediated 7 external audits (Hacken, Omniscia and Guardian).

Links: [first remediation batch](https://github.com/layer-3/nitrolite/pull/631) · [final remediation batch](https://github.com/layer-3/nitrolite/pull/846)

### LiteVault: a multi-chain vault for user funds (2024-2025)

A vault that holds each user's tokens separately. Its withdrawal rules can be replaced, but after any change users get a guaranteed window to withdraw under the old rules. I owned the on-chain design and led its audit remediation, deployments and migrations. At its peak, it held $1.76M of user funds, according to DefiLlama. Its Hacken audit found no Critical or High issues.

Links: [contract](https://github.com/layer-3/broker-contracts/blob/master/src/vault/LiteVault.sol) · [DefiLlama](https://defillama.com/protocol/yellow) · [Hacken report](https://hacken.io/audits/openware-yellow-network/sca-yellow-network-vault-sept-2024/)

### Other work

- **Multi-chain custody (2026):** I owned the Solidity of a custody system where independent providers authorize withdrawals by quorum (several separate signatures are required). [Guardian review](https://guardian.security/portfolio/yellow/nitewatch-2026-03-08/) · [registry contracts](https://github.com/layer-3/clearnet-sdk/tree/main/contracts/src)
- **Ducklings (2023):** an on-chain NFT breeding game. I proposed and co-designed the genome, packed into a single 256-bit number to keep gas costs low, and implemented the prototype. Today there are around 874,000 Ducklings across 224,000 wallets on Polygon. [contracts](https://github.com/layer-3/duckies-v1) · [collection](https://web3.okx.com/nft/collection/polygon/yellow-ducklings-1)
- **Open-source state channels (2022-2023):** contributions to [go-nitro](https://github.com/statechannels/go-nitro/pulls?q=is%3Apr+author%3Anksazonov) and [exit-format](https://github.com/statechannels/exit-format/pull/68), together with the Consensys State Channels team.
- **Tools:** [forge-create](https://github.com/nksazonov/forge-create), which records every contract deployment (address, transaction, constructor arguments, commit), and [chain-rpc](https://github.com/nksazonov/chain-rpc), a command-line tool that finds public RPC endpoints and checks that they serve the expected chain.
- **Upstream bug reports:** [go-ethereum #31203](https://github.com/ethereum/go-ethereum/issues/31203), [go-ethereum #31323](https://github.com/ethereum/go-ethereum/issues/31323), [ZeroDev Kernel #88](https://github.com/zerodevapp/kernel/issues/88), [Pimlico Alto #160](https://github.com/pimlicolabs/alto/issues/160).
- **MSc thesis:** the [Private Key Security Portal](https://github.com/nksazonov/private-key-security-portal), an interactive guide to private keys: how they are generated and stored, multisig, and social recovery.
- **Research:** a [comparison of Solidity, Yul and Vyper](https://github.com/nksazonov/gas-efficacy-pl-analysis) by bytecode size and gas cost.

## What I write about here

How contracts that hold funds are designed, and where they break. I plan to write about state machines and security invariants, working through an audit as the code owner, custody and withdrawal authorization, cross-chain deposits, and the tools I build along the way. I try to write for any engineer, not only for protocol researchers, so every term gets a plain explanation.

## Contact

The best way to reach me is [LinkedIn](https://www.linkedin.com/in/nksazonov/) or email at [sazonov.nks@gmail.com](mailto:sazonov.nks@gmail.com). My code is on [GitHub](https://github.com/nksazonov).
