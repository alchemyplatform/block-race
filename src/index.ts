import { format } from "date-fns";
import { ethers } from "ethers";
import SerializingTaskQueue from "./serializingTaskQueue";

/*
 * Update this dictionary to add endpoints. You may add any number of
 * contestants with whatever keys you choose.
 *
 * Note that PRIMARY_PROVIDER, set below, must be one of the keys of this
 * dictionary.
 */
const PROVIDER_URLS = {
  Alchemy: "wss://eth-mainnet.g.alchemy.com/v2/<alchemy-token>",
  Infura: "wss://mainnet.infura.io/ws/v3/<infura-token>",
};

type Contestant = keyof typeof PROVIDER_URLS;

// This provider is used when we pull additional information for displaying
// results. It must be one of the keys from PROVIDER_URLS, but this choice will
// not affect the competition.
const PRIMARY_PROVIDER: Contestant = "Alchemy";
const BLOCKS_PER_AGGREGATE_PRINT = 10;

interface Aggregates {
  blockCount: number;
  winsByContestant: Record<Contestant, number>;
  totalLagByContestant: Record<Contestant, number>;
  totalLagFromTimestamp: number;
}

function main(): void {
  const providers = mapValues(
    PROVIDER_URLS,
    (url) => new ethers.providers.WebSocketProvider(url)
  );
  const timesByBlockNumber = mapValues(
    providers,
    (): Record<number, number> => ({})
  );

  const taskQueue = new SerializingTaskQueue();
  const aggregates: Aggregates = {
    blockCount: 0,
    winsByContestant: mapValues(PROVIDER_URLS, () => 0),
    totalLagByContestant: mapValues(PROVIDER_URLS, () => 0),
    totalLagFromTimestamp: 0,
  };

  function reportIfSettled(blockNumber: number) {
    const times = mapValues(timesByBlockNumber, (ts) => ts[blockNumber]);
    if (!allTimesSet(times)) {
      return;
    }
    taskQueue.addTask(async () => {
      const { timestamp } = await providers[PRIMARY_PROVIDER].getBlock(
        blockNumber
      );
      const rankedContestants = getRankings(times);
      const winner = rankedContestants[0];
      const winningTime = times[winner];
      const timestampLag = winningTime - timestamp * 1000;
      aggregates.blockCount++;
      aggregates.winsByContestant[winner]++;
      aggregates.totalLagFromTimestamp += timestampLag;
      console.log(
        `Block ${blockNumber} published at ${formatTime(
          winningTime
        )} by ${winner}!`
      );
      console.log(
        `  ...${Math.abs((timestampLag / 1000) | 0)}s ${
          timestampLag < 0 ? "before" : "after"
        } the block timestamp.`
      );
      rankedContestants.slice(1).forEach((contestant) => {
        const lag = times[contestant] - winningTime;
        console.log(`${contestant} trails the leader by ${(lag / 1000) | 0}s.`);
        aggregates.totalLagByContestant[contestant] += lag;
      });
      console.log();
      mapValues(timesByBlockNumber, (ts) => {
        delete ts[blockNumber];
      });
      if (aggregates.blockCount % BLOCKS_PER_AGGREGATE_PRINT === 0) {
        printAggregates(aggregates);
      }
    });
  }

  mapValues(providers, (provider, contestant) => {
    provider.on("block", (blockNumber) => {
      timesByBlockNumber[contestant][blockNumber] = Date.now();
      reportIfSettled(blockNumber);
    });
  });
}

function mapValues<K extends keyof any, V, W>(
  obj: Record<K, V>,
  f: (value: V, key: K) => W
): Record<K, W> {
  const result: any = {};
  Object.keys(obj).forEach((key) => (result[key] = f(obj[key as K], key as K)));
  return result;
}

function allTimesSet(times: Record<Contestant, number>): boolean {
  return Object.values(times).every((time) => time != null);
}

function getRankings(times: Record<Contestant, number>): Contestant[] {
  return Object.entries(times)
    .sort(([, time1], [, time2]) => time1 - time2)
    .map(([contestant]) => contestant) as Contestant[];
}

function formatTime(timestamp: number): string {
  return format(timestamp, "h:mm:ss a");
}

function printAggregates(aggregates: Aggregates): void {
  const {
    blockCount,
    winsByContestant,
    totalLagByContestant,
    totalLagFromTimestamp,
  } = aggregates;
  console.log("AGGREGATION TIME!");
  console.log();
  console.log(`Over the last ${blockCount} blocks...`);
  console.log();
  console.log("Times each provider published first:");
  console.log();
  Object.entries(winsByContestant)
    .sort(([, wins1], [, wins2]) => wins2 - wins1)
    .forEach(([provider, wins]) => console.log(`  ${provider}: ${wins}`));
  console.log();
  console.log("Average seconds trailing the leader:");
  console.log();
  Object.entries(totalLagByContestant)
    .sort(([, lag1], [, lag2]) => lag1 - lag2)
    .forEach(([provider, lag]) =>
      console.log(`  ${provider}: ${(lag / blockCount / 1000).toFixed(2)}s`)
    );
  console.log();
  console.log(
    `Average time from block timestamp to provider discovery: ${(
      totalLagFromTimestamp /
      blockCount /
      1000
    ).toFixed(2)}s`
  );
  console.log();
}

main();
