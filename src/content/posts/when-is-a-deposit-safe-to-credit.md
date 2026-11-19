---
title: "When is a deposit safe to credit? Confirmation windows against reorg attacks"
description: "How crediting a deposit too early creates money that does not exist, and how to choose how long to wait on each chain"
pubDatetime: 2026-11-18T09:00:00Z
draft: false
tags:
  - reorgs
  - finality
  - deposits
  - idempotency
  - rollups
---

Exchanges, bridges, custody services and state-channel nodes all watch a contract, see a "Deposited" event and increase someone's balance in their own database. So every one of them has to answer one question: *when is a deposit safe to credit?*

Credit too early, and a chain reorganization can take the deposit away while the credit stays. Wait too long, and the product becomes slow. In this article I describe the fix I designed for this problem in an off-chain node of a state-channel protocol (and implemented with my team): a per-chain confirmation window between an event and its handler. I also show how to pick the window for each chain, and what the window does NOT cover.

**TL;DR:** choose a waiting window per chain from real reorg data and finality guarantees; delay *every* event, not only deposits; make crediting idempotent; and decide explicitly what happens when a reorg is deeper than your window.

## The attack in 4 steps

Let's start with the naive flow: credit the balance the moment the deposit event arrives.

1. Alice deposits 10 ETH into the contract. Her transaction lands in block 100.
2. The off-chain service receives the `Deposited` event and credits Alice with 10 ETH in its database.
3. Alice immediately transfers the 10 ETH off-chain to Bob (another account she controls), and Bob withdraws.
4. Block 100 is replaced by a competing block at the same height. Alice's deposit is no longer on the chain.

Usually, a transaction from a dropped block is simply included again. However, if Alice managed to get a conflicting transaction (the same nonce, sending her ETH somewhere else) into the winning branch, the deposit never comes back.

On-chain, the contract never received the 10 ETH. Off-chain, the service credited it and let it move to Bob. Thus, the service has lost 10 ETH of its own liquidity, and there is nobody to recover it from: the transfer to Bob was valid by every rule the service checked.

![A deposit is credited and spent off-chain before its block is replaced by a competing block, leaving the credit unbacked.](/images/posts/when-is-a-deposit-safe-to-credit/attack-timeline.svg)

As you can see, the bug is not in any single line of code - it is in the assumption that "seen" means "final".

### Why an attacker can just keep trying

Alice needs luck in step 4: she cannot predict when a reorg happens. However, without any waiting, she can simply repeat the deposit-and-withdraw cycle until a natural reorg hits one of her deposits. Each failed attempt costs her only transaction fees, so the best target is a chain with cheap transactions and frequent short reorgs. Many accounts in parallel make it faster, and it pays off as long as the double-spent amount exceeds the fees.

A waiting window changes this calculation completely. A short reorg no longer helps, because the event is still waiting and gets cancelled. To succeed, Alice now needs a reorg *deeper* than the window, and on the chains I looked at that is not a lottery she can play for small fees: causing one would cost far more than she could steal. What exactly such an attack costs on each chain deserves its own article. For now, we will assume that it is still viable for Alice to perform such an attack, and our system needs to be guarded from it.

## What a reorg is, and what "final" means

A **chain reorganization** (reorg) happens when the network switches from one version of recent history to another: two valid blocks appear at the same height, nodes briefly disagree, and then converge on one branch. Transactions that were only in the losing branch disappear, unless they get included again.

How deep a reorg can go depends on consensus. With **probabilistic finality** (Bitcoin, older Polygon), a block becomes harder to replace with every block on top of it, but never impossible. With **deterministic finality** (Ethereum's finality gadget, BNB Smart Chain, BFT chains), a block is at some point *finalized*, and replacing it requires many validators to break the rules and get punished.

On Ethereum, time is divided into 12-second slots and 32-slot epochs; a block is finalized after two epochs, about 12.8 minutes. Reverting a finalized block would cost an attacker at least [one third of all staked ETH](https://ethereum.org/developers/docs/consensus-mechanisms/pos/).

To compare chains, I found it useful to define three levels by the *probability* of a reorg: 

- **quick** - a natural reorg is less likely than 1 in 10,000
- **safe** - less than 1 in 1,000,000 (0.0001%)
- **hard** - reverting requires a slashable majority of validators.

So "confirmed event" is not a single number, but a decision about how much risk you accept for a given amount of money.

## The obvious fix, and why it is not enough

The problem was not new to me. In all my previous projects we either waited "a few blocks" (a number that, honestly, came out of our heads) or waited for full finality. The former has no justification behind it. The latter is safe, but slow.

For a state-channel protocol, slow is a real problem: users expect to move funds off-chain instantly. Hard finality means about 13 minutes on Ethereum. On optimistic rollups it can be longer: on the [OP Stack](https://docs.optimism.io/op-stack/transactions/transaction-finality), a block becomes "safe" once its data is posted to Ethereum (a few minutes on OP Mainnet), and "finalized" only once that Ethereum block is finalized (15 to 30 minutes on OP Mainnet, hours on chains tuned for lower data costs).

*Note:* the famous 7-day challenge window of optimistic rollups does NOT apply here. It only delays withdrawals back to Ethereum, and a fault-proof challenge does not reorganize rollup transactions. Before finalization, only a reorg of the Ethereum block carrying the rollup's data can change it.

So, there are 2 extremes: credit immediately (perfect experience, unbounded risk), or wait for hard finality everywhere (no reorg risk, slow product). Therefore, the real question is where to sit between them on each chain, and it is a one about trade offs.

## What other systems do

Before designing anything, I surveyed how exchanges, bridges and indexers handle this. Almost everyone waits for a confirmation depth (or a `safe` / `finalized` tag); the differences are in how they choose it.

- **Fixed counts per asset.** Exchanges publish how many confirmations each asset needs and adjust them as consensus changes. OKX, for example, [cut Ethereum deposits from 64 to 32 confirmations](https://www.okx.com/help/okx-to-reduce-the-number-of-confirmations-required-for-deposits-on-eth) in 2023 (about 6.4 minutes, well before finality), while [Kraken lists about 20 minutes](https://support.kraken.com/articles/203325283-cryptocurrency-deposit-processing-times).
- **A capped fast path.** [Circle's CCTP V2](https://developers.circle.com/cctp/concepts/fast-transfer-allowance) lets USDC move after soft finality, but limits the total value of such transfers to a shared allowance. When it is used up, transfers fall back to waiting for hard finality, so the maximum reorg loss is bounded by the allowance.
- **Waiting by value.** Across's relayer, in its [V2 documentation](https://legacy-docs.across.to/relayers/running-a-relayer), waits 16 blocks on Ethereum before filling $100 worth of deposits and 32 blocks before filling $1,000.

Thus, the reorg problem is still a confirmation-depth problem, dressed in different vocabularies.

## The design: a confirmation window between the event and the handler

The fix is simple at its core: **a per-chain delay between the moment an event arrives and the moment its handler runs.** When the service receives an event on chain C:

1. It puts the event into a waiting queue and starts a timer for chain C's window.
2. If the timer ends and nothing happened, the handler runs as usual.
3. If the node reports that the event's block was reorged out, the waiting event is cancelled, with no side effects.
4. If the same transaction is included again in a new block, its event arrives again and starts a fresh window.

The window is set in seconds, because that is what a user sees. The idea is simple. However, there are four details where it is easy to get it wrong.

### Delay every event, not only deposits

The first instinct is to delay only the events that credit money. I decided to delay *all* events from the contract by the same window.

The reason is ordering. Suppose block 100 contains a deposit into one of Alice's channels, and block 101 a challenge on another of her channels, and both handlers touch her balance. If only the deposit waits, the challenge runs first, and the resulting balance can differ from the on-chain truth. A uniform delay preserves the original order and keeps the waiting component dumb: it does not need to understand what each event means. The cost is that harmless events wait too, which I think is a fair price.

### Cancel, restart, and the right key

Ethereum nodes report reorgs explicitly: every log object has a [`removed` flag](https://ethereum.org/developers/docs/apis/json-rpc/), which is `true` "when the log was removed, due to a chain reorganization". When such a copy arrives, the service must cancel the matching waiting event.

The key that identifies a waiting event matters. I used (transaction hash, block hash, log index):

- The log index separates several events of one transaction (within one block, it is unique).
- The block hash is needed because of out-of-order delivery: when a transaction is re-included, the new copy can arrive *before* the removal notice for the old one. With the block hash in the key, the two copies have different keys, and the late removal notice cancels nothing it should not.

![States of a delayed event: it waits for the window, then is processed; a removal notice cancels it; a re-included copy starts a new wait.](/images/posts/when-is-a-deposit-safe-to-credit/event-states.svg)

A removal notice for an event that has already passed the window is the dangerous case (more on it below), so it should at least produce a loud warning.

### Restarts: replay from the last canonical block

The waiting queue lives in memory, so a restart loses waiting events. That is fine: they were never processed.

On startup, the service checks whether the last block in which it processed an event (by *hash*) is still on the chain. If not, it walks back through the hashes it stored for older events until it finds one that is, and replays from there. Hashes, not block numbers, because most blocks contain no events for our contract, and a reorg between two stored blocks would go unnoticed by a number-based walk.

Replayed events skip the window, since history queries return only canonical events.

### Idempotency: credit each deposit once

Sometimes the same deposit reaches the handler twice: its block passes the window and the deposit is credited, then a deeper reorg removes the block, and the same transaction lands in a new block and passes the window again. A replay after a restart can also deliver events that were already processed. Therefore, crediting must be **idempotent** *(applying the same event twice has the same effect as applying it once)*.

To recognize "the same deposit", the service needs a key that does NOT change when a transaction moves to another block. This is the opposite of the waiting-queue key, on purpose:

- The transaction hash stays the same: it is the hash of the signed transaction itself.
- The block hash changes, so it must not be in this key.
- The `logIndex` field can change too: it is the event's position in the *block*, [not in the transaction](https://ethereum.org/developers/docs/apis/json-rpc/). The stable part is the event's position inside its transaction.

So the key is (chain, transaction hash, event position in the transaction). Before crediting, the service checks whether this key was already committed and skips the event if so. A unique constraint on the same key in the database is the second line of defense: even if the check has a bug, the database refuses to store the same deposit twice. (In our system, a deposit that comes back in another block after it was credited is also the signal for the halt described below.)

## Choosing the window for each chain

My method was straightforward: for each chain, find the deepest reorg in its documented history, add 1 block, and compare the result with the chain's finality time. For chains with deterministic finality, the comparison is the answer: it is better to wait for the `finalized` tag than to count blocks.

Below are the values I would suggest today. However, keep in mind: one consensus upgrade can change a row.

| Chain | What the history shows | Suggested window |
| --- | --- | --- |
| Ethereum | Short reorgs still happen ([Etherscan lists them](https://etherscan.io/blocks_forked)). The deepest documented one was [7 blocks, in May 2022](https://barnabe.substack.com/p/pos-ethereum-reorg), before the Merge, caused by an uneven client rollout and a client bug. | About 8 blocks (around 1.5 minutes) where a tiny risk is acceptable; `finalized` (about 13 minutes) otherwise |
| Polygon PoS | A [157-block reorg](https://forum.polygon.technology/t/157-block-reorg-at-block-height-39599624/11388) in 2023. Since the Heimdall v2 upgrade (July 2025) finality takes [about 5 seconds](https://polygon.technology/blog/polygon-5-second-fast-finality-upgrade), yet [Polygonscan lists](https://polygonscan.com/blocks_forked) reorgs of up to 181 blocks during [two](https://www.theblock.co/post/364913/polygon-suffers-hour-long-outage-weeks-after-complex-hard-fork) 2025 [incidents](https://www.metrika.co/blog/post-mortem-polygon), and of 4 and 6 blocks after the [Rio upgrade](https://polygon.technology/blog/polygon-launches-major-payments-upgrade-with-rio-faster-lighter-and-easier-to-build), meant to virtually eliminate them. | Wait for `finalized`, not a fixed timer: finality has stalled before. If you count blocks anyway, the history since Rio gives 7 (6 + 1) |
| BNB Smart Chain | Fast finality ([BEP-126](https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP126.md)): a block is finalized when it and its child are justified by two thirds of validators, usually within about 2 blocks of [0.45 seconds](https://www.bnbchain.org/en/blog/fermi-hard-fork-accelerates-bsc-to-0-45-second-block-times). | Wait for `finalized`, about 1 second |
| OP Stack rollups (Base, OP Mainnet, Ink) | Until the block data is posted to Ethereum, the sequencer can reorg it; after that, only an Ethereum reorg can. On November 18, 2026, over 2 hours of Ethereum blocks, I measured how often each chain posted its data: Base every 36 seconds (at most 96), OP Mainnet every 2.6 minutes (at most 6.4), Ink every 3.8 minutes (at most 4.2). | `safe`: the longest posting gap plus a margin, i.e. about 2 minutes on Base, 7 on OP Mainnet, 5 on Ink. `finalized`: add about 13 minutes |

The weak point of "deepest reorg + 1" is obvious: it does not guarantee that a deeper reorg will never happen. It only says that one has not happened *yet*.

## What the window does not cover

When the window is shorter than hard finality, some risk remains: an event passes the window, the service credits it, and then a deeper reorg removes the block. The database now holds a credit with no deposit behind it.

There are two honest ways to deal with this:

1. **Wait for hard finality everywhere,** which brings back the slow product.
2. **Detect it and react,** either by *fixing the state automatically* (roll back the credit and everything that depended on it, which can reach far once funds have moved), or by *halting and fixing manually* (a circuit breaker that stops the system as soon as a credited event turns out to be non-canonical).

We chose the latter: the window is sized so that a deeper reorg has not happened on the chains we use, and if it happens anyway, the system halts instead of operating on balances it cannot back. A deposit is either credited exactly once, or the system stops. This trades liveness for safety, which I think is the right trade for a system that holds user funds. Detection and recovery deserve a separate article.

## Checklist

If you build anything that credits balances from on-chain events:

1. Never treat "seen" as "final". Put an explicit window between the event and the credit.
2. Choose the window per chain from its consensus and reorg history, and re-check it after every upgrade.
3. Delay all events from the contract uniformly, so their order is preserved.
4. Key waiting events by (transaction hash, block hash, log index), and handle the `removed` flag, including out-of-order delivery.
5. Make crediting idempotent by (chain, transaction hash, event position in the transaction), not by the block-wide log index.
6. Decide in advance what happens when a reorg is deeper than your window, and make sure it is at least loud.

