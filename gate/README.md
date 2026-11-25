# Trust Hub Gate: one line for any open agentic website

Your agentified website can call partner networks on other sites. This gate makes the Agentic Trust Hub check each partner network **before any of its agents run in your visitor's browser**, using the same engine and plain-language law as the hub itself.

## Add it

In your `site.js` (the file the agentify-website skill makes), right after the runtime boots:

```js
(await import("https://2738777-ai.github.io/agentic-trust-hub/gate/trust-hub-gate.js")).install(booted.engine);
```

That is the whole install. To pin a version, copy `trust-hub-gate.js` into your own site and import it from there.

## What it does (the rules)

| # | Rule | Why |
|---|---|---|
| 1 | The consent card counts only `allow`, `always` and `decline`. Anything else is `decline`. | The runtime treats a missing answer as allow. |
| 2 | The check runs where the runtime fetches the partner network, not in the consent card. | After *Always allow* the card never shows again, but every fetch still passes here. |
| 3 | Before contacting a partner, the runtime's own `allowed_peers` and cycle checks run. | A partner you did not allow is never touched. |
| 4 | Each partner file is fetched once; both checkers read that one snapshot. | A partner cannot show each checker something different. |
| 5 | The law decides: GREEN and YELLOW run; REVIEW, DENY and unreadable are blocked, and none of the partner's agents run. | One plain-language decision, worst verdict wins. |
| 6 | The snapshot's fingerprint must match the files the runtime compiled. | Stops "show the checker one version, run another". |
| 7 | A blocked network never stays in the runtime's cache. | *Always allow* cannot bring it back. |
| 8 | If the gate cannot load, cannot read the law, or meets a runtime it does not know, partner calls are off. | Fails closed. |
| 9 | Private context (`sly_data`) reaches a partner only if your agent's `allow.to_downstream` names the field **and** you name that partner for it. | Per-destination, not one list for every site. |

The checkers are [Agent Customs](https://github.com/montbaga/agent-customs) (hidden instructions in a network) and [NandaSeal](https://github.com/cocvn157/nanda-seal) (manifest integrity and signatures). The default law is [`core/法典.en.txt`](../core/法典.en.txt).

## Options

```js
const gate = (await import(".../trust-hub-gate.js")).install(booted.engine, {
  law: myLawText,                       // your own plain-language law; install fails if it cannot be read
  privateContext: {                     // rule 9: which partner may receive which named field
    "https://partner.example/their_network": ["visitor_language"],
  },
  statusElement: document.querySelector("#assistant-status"),  // writes each decision there
  onReport: (r) => console.log(r),      // { partner, host, allowed, decision, reason, reasons[], privateContextSent? }
});
```

`reason` is `law`, `bait-and-switch` or `unreadable`. Each item in `reasons` is `{ checker, code, level, lawLine }`.

## Proof

- `tests/agent/gate_bundle.test.mjs`: this exact file, installed on the real official runtime engine, against partners on a second local origin.
- `tests/agent/trust_gate.test.mjs`, `tests/agent/private_context.test.mjs`: the gate's rules one by one.
- `experiments/跨站同意/`: the design, model-checked over 240 paths (0 violations).

Built from `gate/入口.mjs` by `node tools/打包閘門.mjs`. Do not edit the built file. Licenses: see [NOTICE](../NOTICE).
