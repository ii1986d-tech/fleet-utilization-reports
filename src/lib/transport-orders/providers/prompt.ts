import { EXTRACTION_SCHEMA_VERSION } from "@/lib/transport-orders/schema";

/**
 * Provider-neutral extraction instructions. Adapters must not log PDF bytes or
 * full response bodies containing operational values.
 */
export function buildExtractionPrompt(filename: string): string {
  return [
    "You extract structured data from a transport-order / Bordero PDF.",
    "Return ONLY a single JSON object (no markdown fences) matching this shape:",
    `{`,
    `  "schemaVersion": "${EXTRACTION_SCHEMA_VERSION}",`,
    `  "tourNumber": string|null,`,
    `  "borderoNumber": string|null,`,
    `  "businessIdentifier": string|null,`,
    `  "referenceNumbers": string[],`,
    `  "responsibleClerk": string|null,`,
    `  "remarks": string|null,`,
    `  "freight": { "amount": number|null, "currency": string|null },`,
    `  "paidKilometers": number|null,`,
    `  "emptyKilometers": number|null,`,
    `  "truckLicensePlate": string|null,`,
    `  "trailerLicensePlate": string|null,`,
    `  "cargoWeightKg": number|null,`,
    `  "cargoLoadingMeters": number|null,`,
    `  "cargoVolumeM3": number|null,`,
    `  "cargoDescription": string|null,`,
    `  "stops": [{`,
    `    "sequence": positiveInt,`,
    `    "type": "pickup"|"delivery"|"other",`,
    `    "address": {`,
    `      "company": string|null, "street": string|null, "houseNumber": string|null,`,
    `      "postalCode": string|null, "city": string|null, "country": string|null,`,
    `      "rawAddressText": string|null`,
    `    },`,
    `    "date": string|null,`,
    `    "timeWindow": string|null,`,
    `    "references": string[],`,
    `    "remarks": string|null`,
    `  }],`,
    `  "partialLoadPositions": [{`,
    `    "positionNumber": number|null,`,
    `    "pickupSequence": positiveInt,`,
    `    "deliverySequence": positiveInt,`,
    `    "references": string[],`,
    `    "weightKg": number|null,`,
    `    "loadingMeters": number|null,`,
    `    "volumeM3": number|null`,
    `  }],`,
    `  "transportLegs": [{`,
    `    "sequence": positiveInt,`,
    `    "originSequence": positiveInt,`,
    `    "destinationSequence": positiveInt,`,
    `    "references": string[],`,
    `    "distanceKm": number|null`,
    `  }]`,
    `}`,
    "Rules:",
    "- Use only values shown in the PDF. Do not invent addresses, plates, or freight.",
    "- Keep separate stop entities even if addresses repeat.",
    "- Prefer null over guessing. Incomplete addresses may leave street null.",
    `- Filename hint (metadata only): ${filename}`,
  ].join("\n");
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty provider text response.");
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("Provider response is not valid JSON.");
  }
}
