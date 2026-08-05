import { PROVIDER_TIMEOUT_MS } from "@/lib/transport-orders/constants";
import {
  EXTRACTION_SCHEMA_VERSION,
  PROMPT_VERSION_MOCK,
  type ExtractionResult,
} from "@/lib/transport-orders/schema";
import type {
  PdfExtractionProvider,
  ProviderExtractInput,
  ProviderExtractOutcome,
} from "@/lib/transport-orders/providers/types";

export type MockProviderMode =
  | "success_simple"
  | "success_partial_loads"
  | "success_roundtrip"
  | "success_billing_provenance"
  | "success_incomplete_address"
  | "malformed_json"
  | "timeout"
  | "non_retryable";

function simpleResult(): ExtractionResult {
  return {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    tourNumber: "SYN-TOUR-001",
    borderoNumber: null,
    businessIdentifier: "SYN-TOUR-001",
    referenceNumbers: ["SYN-REF-1"],
    responsibleClerk: null,
    remarks: null,
    freight: { amount: 150, currency: "EUR" },
    paidKilometers: null,
    emptyKilometers: null,
    truckLicensePlate: "SYN-TRUCK",
    trailerLicensePlate: null,
    cargoWeightKg: 8000,
    cargoLoadingMeters: 1,
    cargoVolumeM3: null,
    cargoDescription: "Synthetic cargo",
    stops: [
      {
        sequence: 1,
        type: "pickup",
        address: {
          company: "Synthetic Pickup Co",
          street: "Pickup Street 1",
          houseNumber: null,
          postalCode: "10000",
          city: "PickupCity",
          country: "DE",
          rawAddressText: null,
        },
        date: "2026-08-01",
        timeWindow: "08:00-12:00",
        references: [],
        remarks: null,
      },
      {
        sequence: 2,
        type: "delivery",
        address: {
          company: "Synthetic Delivery Co",
          street: "Delivery Street 2",
          houseNumber: null,
          postalCode: "20000",
          city: "DeliveryCity",
          country: "FR",
          rawAddressText: null,
        },
        date: "2026-08-02",
        timeWindow: "14:00",
        references: [],
        remarks: null,
      },
    ],
    partialLoadPositions: [],
    transportLegs: [],
  };
}

function partialLoadsResult(): ExtractionResult {
  const base = simpleResult();
  return {
    ...base,
    tourNumber: "SYN-PARTIAL-001",
    businessIdentifier: "SYN-PARTIAL-001",
    stops: [
      {
        ...base.stops[0],
        sequence: 1,
        type: "pickup",
        address: { ...base.stops[0].address, company: "Pickup A", city: "CityA" },
      },
      {
        ...base.stops[0],
        sequence: 2,
        type: "pickup",
        address: { ...base.stops[0].address, company: "Pickup B", city: "CityB" },
      },
      {
        ...base.stops[1],
        sequence: 3,
        type: "delivery",
        address: { ...base.stops[1].address, company: "Shared Delivery", city: "CityC" },
      },
    ],
    partialLoadPositions: [
      {
        positionNumber: 1,
        pickupSequence: 1,
        deliverySequence: 3,
        references: ["POS-1"],
        weightKg: null,
        loadingMeters: null,
        volumeM3: null,
      },
      {
        positionNumber: 2,
        pickupSequence: 2,
        deliverySequence: 3,
        references: ["POS-2"],
        weightKg: null,
        loadingMeters: null,
        volumeM3: null,
      },
    ],
    cargoWeightKg: 20000,
    cargoLoadingMeters: 2,
    cargoVolumeM3: 10,
  };
}

function roundtripResult(): ExtractionResult {
  const base = simpleResult();
  return {
    ...base,
    tourNumber: "SYN-RT-001",
    businessIdentifier: "SYN-RT-001",
    stops: [
      {
        sequence: 1,
        type: "pickup",
        address: {
          company: "Site Alpha",
          street: "Alpha 1",
          houseNumber: null,
          postalCode: "11111",
          city: "AlphaCity",
          country: "DE",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: ["LEG1"],
        remarks: null,
      },
      {
        sequence: 2,
        type: "delivery",
        address: {
          company: "Site Beta",
          street: "Beta 1",
          houseNumber: null,
          postalCode: "22222",
          city: "BetaCity",
          country: "ES",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: ["LEG1"],
        remarks: null,
      },
      {
        sequence: 3,
        type: "pickup",
        address: {
          company: "Site Beta",
          street: "Beta 1",
          houseNumber: null,
          postalCode: "22222",
          city: "BetaCity",
          country: "ES",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: ["LEG2"],
        remarks: null,
      },
      {
        sequence: 4,
        type: "delivery",
        address: {
          company: "Site Alpha",
          street: "Alpha 1",
          houseNumber: null,
          postalCode: "11111",
          city: "AlphaCity",
          country: "DE",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: ["LEG2"],
        remarks: null,
      },
    ],
    transportLegs: [
      {
        sequence: 1,
        originSequence: 1,
        destinationSequence: 2,
        references: ["LEG1"],
        distanceKm: null,
      },
      {
        sequence: 2,
        originSequence: 3,
        destinationSequence: 4,
        references: ["LEG2"],
        distanceKm: null,
      },
    ],
  };
}

function billingResult(): ExtractionResult {
  const base = simpleResult();
  return {
    ...base,
    tourNumber: "SYN-BILL-001",
    businessIdentifier: "SYN-BILL-001",
    paidKilometers: 787,
    paidKilometersSource: "Line Haul Units",
    freight: { amount: 1018.71, currency: "EUR" },
    freightSource: "Grand Total",
  };
}

function incompleteAddressResult(): ExtractionResult {
  const base = simpleResult();
  return {
    ...base,
    tourNumber: "SYN-INCOMPLETE-001",
    businessIdentifier: "SYN-INCOMPLETE-001",
    stops: [
      base.stops[0],
      {
        ...base.stops[1],
        address: {
          company: "GC Location",
          street: null,
          houseNumber: null,
          postalCode: null,
          city: "IncompleteCity",
          country: "ES",
          rawAddressText: "GC IncompleteCity",
        },
      },
    ],
  };
}

export class MockPdfExtractionProvider implements PdfExtractionProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-deterministic-v1";
  readonly promptVersion = PROMPT_VERSION_MOCK;
  readonly supportsNativePdf = true;
  readonly supportsStructuredOutput = true;

  constructor(private readonly mode: MockProviderMode = "success_simple") {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async extractPdf(input: ProviderExtractInput): Promise<ProviderExtractOutcome> {
    const started = Date.now();
    if (input.timeoutMs < 1) {
      return {
        ok: false,
        errorClass: "retryable",
        message: "Timeout budget exhausted.",
        providerName: this.providerName,
        modelName: this.modelName,
        promptVersion: this.promptVersion,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
      };
    }

    switch (this.mode) {
      case "timeout":
        return {
          ok: false,
          errorClass: "retryable",
          message: `Simulated timeout after ${PROVIDER_TIMEOUT_MS}ms`,
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
        };
      case "non_retryable":
        return {
          ok: false,
          errorClass: "non_retryable",
          message: "Simulated non-retryable provider failure",
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
        };
      case "malformed_json":
        // Caller must treat unknown payload as failure via schema parse.
        return {
          ok: false,
          errorClass: "non_retryable",
          message: "Malformed provider JSON",
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
        };
      case "success_simple":
        return {
          ok: true,
          result: simpleResult(),
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
        };
      case "success_partial_loads":
        return {
          ok: true,
          result: partialLoadsResult(),
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
        };
      case "success_roundtrip":
        return {
          ok: true,
          result: roundtripResult(),
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
        };
      case "success_billing_provenance":
        return {
          ok: true,
          result: billingResult(),
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
        };
      case "success_incomplete_address":
        return {
          ok: true,
          result: incompleteAddressResult(),
          providerName: this.providerName,
          modelName: this.modelName,
          promptVersion: this.promptVersion,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          latencyMs: Date.now() - started,
        };
      default: {
        const _exhaustive: never = this.mode;
        return _exhaustive;
      }
    }
  }
}
