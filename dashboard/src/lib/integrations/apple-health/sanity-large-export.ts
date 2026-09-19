/**
 * Runnable proof that the export.xml parser holds constant memory on a file
 * far larger than RAM budget, without needing a real export.zip.
 *
 * It synthesises a multi-year export as a lazy stream of chunks, so the bytes
 * are generated and discarded rather than buffered anywhere.
 *
 *   cd dashboard
 *   node --import tsx --expose-gc src/lib/integrations/apple-health/sanity-large-export.ts
 *   node --import tsx src/lib/integrations/apple-health/sanity-large-export.ts --days 3650
 *
 * `--expose-gc` is optional; it just makes the reported heap figures tighter.
 */

import { aggregateDaily } from "./aggregate";
import { streamAppleHealthExport } from "./parse-export";

interface Args {
  days: number;
  samplesPerDay: number;
}

function parseArgs(argv: string[]): Args {
  const read = (flag: string, fallback: number): number => {
    const index = argv.indexOf(flag);
    if (index === -1) return fallback;
    const value = Number.parseInt(argv[index + 1] ?? "", 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return { days: read("--days", 1825), samplesPerDay: read("--samples-per-day", 400) };
}

function isoDay(dayIndex: number): string {
  return new Date(Date.UTC(2018, 0, 1) + dayIndex * 86_400_000).toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Emit a realistic export.xml in ~1 MB chunks, generated on demand. */
async function* syntheticExport(args: Args): AsyncGenerator<string> {
  yield `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate,Me,(Record|Correlation|Workout|ActivitySummary|ClinicalRecord)*)>
]>
<HealthData locale="en_SG">
 <ExportDate value="2026-09-19 10:00:00 +0800"/>
 <Me HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"/>
`;

  const device =
    "&lt;&lt;HKDevice: 0x282374b90&gt;, name:Apple Watch, manufacturer:Apple Inc., model:Watch, hardware:Watch6,2, software:10.4&gt;";

  let buffer = "";
  for (let day = 0; day < args.days; day++) {
    const date = isoDay(day);

    for (let i = 0; i < args.samplesPerDay; i++) {
      const hour = pad(Math.floor((i / args.samplesPerDay) * 24));
      const minute = pad(i % 60);
      const stamp = `${date} ${hour}:${minute}:00 +0800`;
      const type =
        i % 3 === 0
          ? "HKQuantityTypeIdentifierStepCount"
          : i % 3 === 1
            ? "HKQuantityTypeIdentifierHeartRate"
            : "HKQuantityTypeIdentifierActiveEnergyBurned";
      const unit = type.endsWith("HeartRate") ? "count/min" : type.endsWith("StepCount") ? "count" : "Cal";
      const value = type.endsWith("HeartRate") ? 60 + (i % 90) : (i % 50) + 1;
      buffer += ` <Record type="${type}" sourceName="Krish's Apple Watch" device="${device}" unit="${unit}" creationDate="${stamp}" startDate="${stamp}" endDate="${stamp}" value="${value}"/>\n`;
    }

    // One night of sleep stages and one workout per day.
    const previous = isoDay(Math.max(0, day - 1));
    buffer += ` <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="${previous} 23:00:00 +0800" endDate="${date} 06:30:00 +0800" value="HKCategoryValueSleepAnalysisInBed"/>\n`;
    buffer += ` <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="${previous} 23:10:00 +0800" endDate="${date} 02:10:00 +0800" value="HKCategoryValueSleepAnalysisAsleepCore"/>\n`;
    buffer += ` <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="${date} 02:10:00 +0800" endDate="${date} 04:10:00 +0800" value="HKCategoryValueSleepAnalysisAsleepDeep"/>\n`;
    buffer += ` <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="32.5" durationUnit="min" totalDistance="5.2" totalDistanceUnit="km" totalEnergyBurned="410.5" totalEnergyBurnedUnit="Cal" sourceName="Krish's Apple Watch" startDate="${date} 18:00:00 +0800" endDate="${date} 18:32:30 +0800">
  <MetadataEntry key="HKIndoorWorkout" value="0"/>
  <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="152.4" minimum="98" maximum="178" unit="count/min"/>
 </Workout>\n`;

    if (buffer.length >= 1_000_000) {
      // Hand control back to the event loop between chunks, the way a real
      // fs.createReadStream does. Without this the whole parse runs in one
      // microtask drain and timers (including the heap sampler) never fire.
      await new Promise((resolve) => setImmediate(resolve));
      yield buffer;
      buffer = "";
    }
  }

  yield `${buffer}</HealthData>\n`;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `Synthesising ~${args.days} days x ${args.samplesPerDay} samples/day of Apple Health data...`,
  );

  const baselineRss = process.memoryUsage().rss;
  let peakHeap = 0;
  let peakRss = baselineRss;
  const watch = setInterval(() => {
    const { heapUsed, rss } = process.memoryUsage();
    if (heapUsed > peakHeap) peakHeap = heapUsed;
    if (rss > peakRss) peakRss = rss;
  }, 20);
  watch.unref();

  const startedAt = Date.now();
  let bytesRead = 0;
  const { metrics, workouts } = await aggregateDaily(
    streamAppleHealthExport(syntheticExport(args), {
      includeActivitySummaries: true,
      progressEveryRecords: 1_000_000,
      onProgress: (stats) => {
        bytesRead = stats.bytesRead;
        console.log(
          `  ... ${megabytes(stats.bytesRead)} read, ${stats.recordsEmitted.toLocaleString()} samples, heap ${megabytes(process.memoryUsage().heapUsed)}`,
        );
      },
    }),
  );
  clearInterval(watch);

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const sample = metrics.find((row) => row.metric === "steps");

  console.log("");
  console.log(`Synthetic XML size   ${megabytes(bytesRead)}`);
  console.log(`Elapsed              ${elapsedSeconds.toFixed(1)}s`);
  console.log(`health_metrics rows  ${metrics.length.toLocaleString()}`);
  console.log(`workouts             ${workouts.length.toLocaleString()}`);
  console.log(`baseline RSS         ${megabytes(baselineRss)}`);
  console.log(`peak heap            ${megabytes(peakHeap)}`);
  console.log(`peak RSS             ${megabytes(peakRss)}`);
  console.log("");
  console.log("First steps row:", sample);
  console.log("First workout:  ", workouts[0]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
