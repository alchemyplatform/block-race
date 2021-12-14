# Block Race

A simple script for comparing how quickly Eth providers publish new blocks.

## How to use it

Install dependencies:

```
yarn
```

Edit `src/index.ts` and modify the `PROVIDER_URLS` object, adding whatever
endpoints you choose. For example:

```ts
const PROVIDER_URLS = {
  Alchemy: "wss://eth-mainnet.alchemyapi.io/v2/<alchemy-token>",
  Infura: "wss://mainnet.infura.io/ws/v3/<infura-token>",
};
```

If `Alchemy` isn't one of this object's keys, you should also update the
`PRIMARY_PROVIDER` variable to choose which provider will be used to pull
additional data for displaying results.

Finally, run the script and wait:

```
yarn start
```

Copyright © 2021 Alchemy Insights Inc.
