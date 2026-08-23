# 01 — Problem and principles

## The problem

Consuming teams use the Agentic Experience Platform without the design team present to review usage, answer questions, or catch the things that are technically valid but wrong. The work a design reviewer does is partly rule-shaped, and the rule-shaped part can be encoded once and delivered as tooling that runs without a human. The aim is to remove the need for a reviewer to be present for that part, and to spend the design team's attention only on the cases no rule covers.

This is a greenfield effort. The design language and how it is used are defined from the outset, not retrofitted onto an existing, already-fragmented system, so the work is setting good up front rather than analyzing and correcting how people already build.

One specific failure shapes several decisions. A component gets a team most of the way to what they need, and the last stretch is an edge case it does not handle. The team either contributes upstream and waits behind a queue they cannot influence, or copies the code into a private, disconnected version. The copy is invisible to the Agentic Experience Platform, gets no fixes, and drifts unwatched. A centralized system can look consistent on paper while the shipped product fragments through these copies. Much of the architecture exists to make divergence either unnecessary or visible and governed.

## Principles

- **Force-multiply, not police.** Tooling is judged by whether a consuming team can proceed on its own with good results, not by whether it gives the design team more control over other people's pull requests. A mechanism that only works when the design team is watching has failed.

- **Preventive over detective.** Causing good UI at generation time is worth more than catching bad UI after. Put the most effort into serving rules and exemplars to the agent so the right output is the default; treat the gate as a backstop.

- **Determinism gates, the model assists, taste escalates.** Anything that blocks a merge must be deterministic. The model is used only where it is better than a deterministic lookup. Aesthetic judgment is never a hard gate; the cases that need a human escalate.

- **Enforcement strength matches confidence, and rules graduate.** A rule's strength tracks how confidently it can be checked. A rule can move toward determinism over time: an advisory observation becomes a structural-proxy or deterministic rule once the underlying signal is understood. The system is expected to get more capable as that happens.

- **Conformance, not appropriateness.** "Is this a correct instance of what it claims to be" is checkable and is what contracts gate. "Should this exist for this problem" depends on context not in the artifact and is handled as guidance.

- **Co-locate rules with what they govern.** The guidance served to the agent and the checks run in CI are the same rules in one versioned source, read forwards to build and backwards to verify, so they cannot drift apart.

- **Distribution is boring on purpose.** Tokens and primitives are normal packages. Effort goes into the knowledge layer, the conformance layer, and measurement.

- **Measure the central claim.** That serving context to agents improves output is an open question to measure, not a result to assume. A negative answer is allowed to count.

- **Never call prose a contract.** A document that nothing checks is documentation. The enforced and advisory parts of any artifact stay visibly distinct.
