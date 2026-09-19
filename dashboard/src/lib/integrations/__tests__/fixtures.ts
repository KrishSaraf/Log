/**
 * Synthetic fixtures. Deliberately hand-written rather than captured from a
 * real export so the tests can run with no personal data present.
 *
 * The XML reproduces the awkward parts of a real `export.xml`:
 * - a DOCTYPE with an internal DTD subset
 * - `device` attributes containing escaped angle brackets
 * - a workout with children (MetadataEntry / WorkoutEvent / WorkoutStatistics)
 * - a self-closing workout
 * - non-UTC offsets, including samples either side of local midnight
 * - units that are not our canonical units (lb, mi, Cal)
 * - an unmapped record type
 */

const DEVICE =
  "&lt;&lt;HKDevice: 0x282374b90&gt;, name:Apple Watch, manufacturer:Apple Inc., model:Watch, hardware:Watch6,2, software:10.4&gt;";

export const SAMPLE_EXPORT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate,Me,(Record|Correlation|Workout|ActivitySummary|ClinicalRecord)*)>
<!ATTLIST HealthData locale CDATA #REQUIRED>
<!ELEMENT Record ((MetadataEntry|HeartRateVariabilityMetadataList)*)>
]>
<HealthData locale="en_SG">
 <ExportDate value="2026-09-19 10:00:00 +0800"/>
 <Me HKCharacteristicTypeIdentifierDateOfBirth="" HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"/>

 <!-- Steps: two sources on the same day, plus one sample that is on 09-16 in
      UTC but still 09-16 locally, and one late-evening sample that UTC would
      push into the next day. -->
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Krish's iPhone" sourceVersion="18.0" unit="count" creationDate="2026-09-16 09:00:00 +0800" startDate="2026-09-16 08:30:00 +0800" endDate="2026-09-16 08:45:00 +0800" value="1200"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Krish's iPhone" sourceVersion="18.0" unit="count" creationDate="2026-09-16 23:50:00 +0800" startDate="2026-09-16 23:30:00 +0800" endDate="2026-09-16 23:45:00 +0800" value="800"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Krish's Apple Watch" device="${DEVICE}" unit="count" creationDate="2026-09-16 09:00:00 +0800" startDate="2026-09-16 08:30:00 +0800" endDate="2026-09-16 08:45:00 +0800" value="1350"/>

 <!-- Active energy recorded in "Cal", HealthKit's spelling for kilocalories. -->
 <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="Krish's Apple Watch" unit="Cal" startDate="2026-09-16 08:30:00 +0800" endDate="2026-09-16 08:45:00 +0800" value="45.5"/>
 <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="Krish's Apple Watch" unit="Cal" startDate="2026-09-16 18:00:00 +0800" endDate="2026-09-16 18:30:00 +0800" value="120.25"/>

 <Record type="HKQuantityTypeIdentifierAppleExerciseTime" sourceName="Krish's Apple Watch" unit="min" startDate="2026-09-16 18:00:00 +0800" endDate="2026-09-16 18:30:00 +0800" value="30"/>

 <!-- Weight in pounds; must be converted to kg and reduced with "latest". -->
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Withings" unit="lb" startDate="2026-09-16 07:00:00 +0800" endDate="2026-09-16 07:00:00 +0800" value="165.3"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Withings" unit="lb" startDate="2026-09-16 21:00:00 +0800" endDate="2026-09-16 21:00:00 +0800" value="167.1"/>

 <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Krish's Apple Watch" unit="count/min" startDate="2026-09-16 08:00:00 +0800" endDate="2026-09-16 08:00:00 +0800" value="58"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Krish's Apple Watch" unit="count/min" startDate="2026-09-16 12:00:00 +0800" endDate="2026-09-16 12:00:00 +0800" value="74"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Krish's Apple Watch" unit="count/min" startDate="2026-09-16 18:10:00 +0800" endDate="2026-09-16 18:10:00 +0800" value="150"/>

 <Record type="HKQuantityTypeIdentifierOxygenSaturation" sourceName="Krish's Apple Watch" unit="%" startDate="2026-09-16 03:00:00 +0800" endDate="2026-09-16 03:00:00 +0800" value="0.97"/>

 <!-- Nutrition written into HealthKit by a food-logging app. -->
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="Cronometer" unit="kcal" startDate="2026-09-16 13:00:00 +0800" endDate="2026-09-16 13:00:00 +0800" value="620"/>
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="Cronometer" unit="kcal" startDate="2026-09-16 20:00:00 +0800" endDate="2026-09-16 20:00:00 +0800" value="810"/>
 <Record type="HKQuantityTypeIdentifierDietaryProtein" sourceName="Cronometer" unit="g" startDate="2026-09-16 13:00:00 +0800" endDate="2026-09-16 13:00:00 +0800" value="42.5"/>

 <!-- Sleep for the night of the 15th into the 16th: attributed to the 16th. -->
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-15 23:00:00 +0800" endDate="2026-09-16 06:30:00 +0800" value="HKCategoryValueSleepAnalysisInBed"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-15 23:10:00 +0800" endDate="2026-09-16 01:10:00 +0800" value="HKCategoryValueSleepAnalysisAsleepCore"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-16 01:10:00 +0800" endDate="2026-09-16 02:10:00 +0800" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-16 02:10:00 +0800" endDate="2026-09-16 03:40:00 +0800" value="HKCategoryValueSleepAnalysisAsleepREM"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-16 03:40:00 +0800" endDate="2026-09-16 03:50:00 +0800" value="HKCategoryValueSleepAnalysisAwake"/>
 <!-- Duplicate of the Core block, as re-imported data sometimes produces. -->
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Krish's Apple Watch" startDate="2026-09-15 23:10:00 +0800" endDate="2026-09-16 01:10:00 +0800" value="HKCategoryValueSleepAnalysisAsleepCore"/>

 <Record type="HKCategoryTypeIdentifierMindfulSession" sourceName="Mindfulness" startDate="2026-09-16 07:00:00 +0800" endDate="2026-09-16 07:12:00 +0800"/>

 <!-- Not in our mapping table; must be counted, not crash. -->
 <Record type="HKQuantityTypeIdentifierEnvironmentalAudioExposure" sourceName="Krish's Apple Watch" unit="dBASPL" startDate="2026-09-16 10:00:00 +0800" endDate="2026-09-16 10:05:00 +0800" value="62"/>

 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="32.5" durationUnit="min" totalDistance="5.2" totalDistanceUnit="mi" totalEnergyBurned="410.5" totalEnergyBurnedUnit="Cal" sourceName="Krish's Apple Watch" device="${DEVICE}" creationDate="2026-09-16 18:35:00 +0800" startDate="2026-09-16 18:00:00 +0800" endDate="2026-09-16 18:32:30 +0800">
  <MetadataEntry key="HKIndoorWorkout" value="0"/>
  <MetadataEntry key="HKWeatherTemperature" value="88.7 degF"/>
  <WorkoutEvent type="HKWorkoutEventTypeSegment" date="2026-09-16 18:00:00 +0800" duration="10" durationUnit="min"/>
  <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" startDate="2026-09-16 18:00:00 +0800" endDate="2026-09-16 18:32:30 +0800" average="152.4" minimum="98" maximum="178" unit="count/min"/>
  <WorkoutRoute sourceName="Krish's Apple Watch" startDate="2026-09-16 18:00:00 +0800" endDate="2026-09-16 18:32:30 +0800">
   <FileReference path="/workout-routes/route_2026-09-16_6.32pm.gpx"/>
  </WorkoutRoute>
 </Workout>

 <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="45" durationUnit="min" totalEnergyBurned="300" totalEnergyBurnedUnit="kcal" sourceName="Hevy" startDate="2026-09-17 07:00:00 +0800" endDate="2026-09-17 07:45:00 +0800"/>

 <ActivitySummary dateComponents="2026-09-16" activeEnergyBurned="620.25" activeEnergyBurnedGoal="650" appleMoveTime="0" appleMoveTimeGoal="0" appleExerciseTime="41" appleExerciseTimeGoal="30" appleStandHours="11" appleStandHoursGoal="12"/>
</HealthData>
`;

/** A Health Auto Export Version 2 body with "Summarize Data" off. */
export const HAE_PAYLOAD_UNAGGREGATED = {
  data: {
    metrics: [
      {
        name: "step_count",
        units: "count",
        data: [
          { qty: 1200, date: "2026-09-16 08:45:00 +0800", source: "Krish's iPhone" },
          { qty: 800, date: "2026-09-16 23:45:00 +0800", source: "Krish's iPhone" },
          { qty: 1350, date: "2026-09-16 08:45:00 +0800", source: "Krish's Apple Watch" },
        ],
      },
      {
        name: "active_energy",
        units: "kJ",
        data: [{ qty: 1000, date: "2026-09-16 18:30:00 +0800", source: "Krish's Apple Watch" }],
      },
      {
        name: "heart_rate",
        units: "bpm",
        data: [{ date: "2026-09-16 12:00:00 +0800", Min: 58, Avg: 74, Max: 150 }],
      },
      {
        name: "weight_&_body_mass",
        units: "lb",
        data: [{ qty: 167.1, date: "2026-09-16 21:00:00 +0800", source: "Withings" }],
      },
      {
        name: "dietary_energy",
        units: "kcal",
        data: [
          { qty: 620, date: "2026-09-16 13:00:00 +0800", source: "Cronometer" },
          { qty: 810, date: "2026-09-16 20:00:00 +0800", source: "Cronometer" },
        ],
      },
      {
        name: "sleep_analysis",
        units: "hr",
        data: [
          {
            startDate: "2026-09-15 23:10:00 +0800",
            endDate: "2026-09-16 01:10:00 +0800",
            qty: 2,
            value: "Core",
            source: "Krish's Apple Watch",
          },
          {
            startDate: "2026-09-16 01:10:00 +0800",
            endDate: "2026-09-16 02:10:00 +0800",
            qty: 1,
            value: "Deep",
            source: "Krish's Apple Watch",
          },
          {
            startDate: "2026-09-16 02:10:00 +0800",
            endDate: "2026-09-16 03:40:00 +0800",
            qty: 1.5,
            value: "REM",
            source: "Krish's Apple Watch",
          },
        ],
      },
      {
        name: "some_metric_apple_added_last_week",
        units: "count",
        data: [{ qty: 1, date: "2026-09-16 12:00:00 +0800" }],
      },
    ],
    workouts: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Running",
        start: "2026-09-16 18:00:00 +0800",
        end: "2026-09-16 18:32:30 +0800",
        duration: 1950,
        activeEnergyBurned: { qty: 410.5, units: "kcal" },
        distance: { qty: 8.37, units: "km" },
        heartRate: { min: 98, avg: 152.4, max: 178 },
      },
    ],
  },
};

/** The same night with "Summarize Data" on. */
export const HAE_PAYLOAD_AGGREGATED = {
  data: {
    metrics: [
      {
        name: "sleep_analysis",
        units: "hr",
        data: [
          {
            date: "2026-09-16",
            totalSleep: 4.5,
            asleep: 4.5,
            core: 2,
            deep: 1,
            rem: 1.5,
            awake: 0.1667,
            inBed: 7.5,
            sleepStart: "2026-09-15 23:00:00 +0800",
            sleepEnd: "2026-09-16 06:30:00 +0800",
            source: "Krish's Apple Watch",
          },
        ],
      },
    ],
  },
};

/** Minimal USDA `/foods/search` response, shaped like the live API. */
export const FDC_SEARCH_RESPONSE = {
  totalHits: 2,
  foods: [
    {
      fdcId: 2057648,
      description: "CHEDDAR CHEESE",
      dataType: "Branded",
      brandOwner: "Grafton Village Cheese Co, LLC",
      brandName: "GRAFTON VILLAGE",
      gtinUpc: "094395000172",
      servingSize: 28.0,
      servingSizeUnit: "g",
      householdServingFullText: "1 ONZ",
      brandedFoodCategory: "Cheese",
      foodNutrients: [
        { nutrientId: 1003, nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 21.4 },
        { nutrientId: 1004, nutrientNumber: "204", nutrientName: "Total lipid (fat)", unitName: "G", value: 28.6 },
        {
          nutrientId: 1005,
          nutrientNumber: "205",
          nutrientName: "Carbohydrate, by difference",
          unitName: "G",
          value: 3.57,
        },
        { nutrientId: 1008, nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 357 },
        { nutrientId: 1093, nutrientNumber: "307", nutrientName: "Sodium, Na", unitName: "MG", value: 643 },
      ],
    },
    {
      // A Foundation-style entry with only a fatty-acid panel: no macros.
      fdcId: 2759004,
      description: "Lunchmeat, chicken breast, sliced",
      dataType: "Foundation",
      foodNutrients: [
        { nutrientId: 1281, nutrientNumber: "821", nutrientName: "TFA 14:1 t", unitName: "G", value: 0 },
      ],
    },
  ],
};

/** Minimal USDA `/food/{id}?format=abridged` response. */
export const FDC_ABRIDGED_FOOD = {
  fdcId: 2057648,
  description: "CHEDDAR CHEESE",
  dataType: "Branded",
  brandOwner: "Grafton Village Cheese Co, LLC",
  gtinUpc: "094395000172",
  servingSize: 28.0,
  servingSizeUnit: "g",
  foodNutrients: [
    { number: "203", name: "Protein", amount: 21.4, unitName: "G" },
    { number: "204", name: "Total lipid (fat)", amount: 28.6, unitName: "G" },
    { number: "205", name: "Carbohydrate, by difference", amount: 3.57, unitName: "G" },
    { number: "208", name: "Energy", amount: 357, unitName: "KCAL" },
  ],
};

/** Minimal Open Food Facts `/api/v2/product/{code}.json` response. */
export const OFF_PRODUCT_RESPONSE = {
  status: 1,
  code: "3017624010701",
  product: {
    code: "3017624010701",
    product_name: "Nutella",
    brands: "Ferrero,Nutella",
    categories: "Spreads,Sweet spreads",
    serving_size: "15 g",
    serving_quantity: 15,
    nutriments: {
      "energy-kcal_100g": 539,
      energy_100g: 2227.9,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
      sugars_100g: 56.3,
      sodium_100g: 0.043,
    },
  },
};
