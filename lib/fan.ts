type FanCreateInput = {
  customerName: string;
  phone: string;
  email: string;
  county: string;
  city: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  parcels: number;
  envelopes: number;
  weight: number;
  pickupDate: string;
  pickupFrom: string;
  pickupTo: string;
  observations?: string;
  orderNumber?: string;
};

type FanJson = Record<string, unknown>;

const FAN_API_BASE = "https://api.fancourier.ro";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Lipsește variabila de mediu ${name}.`);
  }
  return value.trim();
}

function parseJsonSafe(raw: string): FanJson | null {
  try {
    return raw ? (JSON.parse(raw) as FanJson) : null;
  } catch {
    return null;
  }
}

async function fanLogin(): Promise<string> {
  const username = getEnv("FAN_USER");
  const password = getEnv("FAN_PASSWORD");

  const url = new URL(`${FAN_API_BASE}/login`);
  url.searchParams.set("username", username);
  url.searchParams.set("password", password);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const raw = await res.text();
  const json = parseJsonSafe(raw);

  if (!res.ok) {
    const msg =
      typeof json?.message === "string"
        ? json.message
        : raw || "Autentificarea FAN a eșuat.";
    throw new Error(msg);
  }

  const token =
    typeof json?.token === "string"
      ? json.token
      : json &&
          typeof json.data === "object" &&
          json.data !== null &&
          "token" in json.data &&
          typeof (json.data as Record<string, unknown>).token === "string"
        ? ((json.data as Record<string, unknown>).token as string)
        : "";

  if (!token) {
    throw new Error("FAN nu a returnat token la login.");
  }

  return token;
}

async function fanPost(
  path: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<FanJson | null> {
  const res = await fetch(`${FAN_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await res.text();
  const json = parseJsonSafe(raw);

  if (!res.ok) {
    const msg =
      typeof json?.message === "string"
        ? json.message
        : raw || `FAN ${path} a eșuat.`;
    throw new Error(msg);
  }

  if (
    json &&
    typeof json.status === "string" &&
    json.status.toLowerCase() === "fail"
  ) {
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : `FAN ${path} a răspuns cu fail.`,
    );
  }

  return json;
}

function getClientId(): number {
  const value = getEnv("FAN_CLIENT");
  const clientId = Number(value);

  if (!Number.isFinite(clientId)) {
    throw new Error("FAN_CLIENT trebuie să fie numeric.");
  }

  return clientId;
}

function extractAwb(data: FanJson | null): string | null {
  if (!data) return null;

  const directKeys = [
    "awb",
    "Awb",
    "awbNumber",
    "AwbNumber",
    "number",
    "Number",
  ];

  for (const key of directKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  if (typeof data.data === "object" && data.data !== null) {
    const nested = data.data as Record<string, unknown>;

    for (const key of directKeys) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
  }

  if (Array.isArray(data.data) && data.data.length > 0) {
    const first = data.data[0];
    if (typeof first === "object" && first !== null) {
      const nested = first as Record<string, unknown>;

      for (const key of directKeys) {
        const value = nested[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
      }
    }
  }

  if (Array.isArray(data.response) && data.response.length > 0) {
    const first = data.response[0];
    if (typeof first === "object" && first !== null) {
      const nested = first as Record<string, unknown>;

      for (const key of directKeys) {
        const value = nested[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
      }
    }
  }

  return null;
}

export async function createFanAwb(input: FanCreateInput) {
  const token = await fanLogin();
  const clientId = getClientId();

  const recipientName = getEnv("RETURN_RECIPIENT_NAME");
  const recipientPhone = getEnv("RETURN_RECIPIENT_PHONE");
  const recipientEmail = getEnv("RETURN_RECIPIENT_EMAIL");
  const recipientCounty = getEnv("RETURN_RECIPIENT_COUNTY");
  const recipientCity = getEnv("RETURN_RECIPIENT_CITY");
  const recipientStreet = getEnv("RETURN_RECIPIENT_STREET");
  const recipientStreetNo = getEnv("RETURN_RECIPIENT_STREET_NO");
  const recipientZipCode = getEnv("RETURN_RECIPIENT_ZIP_CODE");

  const awbPayload: Record<string, unknown> = {
    clientId,
    shipments: [
      {
        info: {
          service: "Standard",
          packages: {
            parcel: input.parcels,
            envelopes: input.envelopes,
          },
          weight: input.weight,
          payment: "receiver",
          cod: 0,
          declaredValue: 0,
          observation: input.observations || "",
          content: input.orderNumber
            ? `Retur comandă ${input.orderNumber}`
            : "Retur client",
          dimensions: {
            length: 10,
            width: 10,
            height: 10,
          },
          options: ["F"],
        },
        sender: {
          name: input.customerName,
          phone: input.phone,
          contactPerson: input.customerName,
          email: input.email,
          address: {
            county: input.county,
            locality: input.city,
            street: input.street,
            streetNo: input.streetNumber,
            zipCode: input.zipCode,
          },
        },
        recipient: {
          name: recipientName,
          phone: recipientPhone,
          contactPerson: recipientName,
          email: recipientEmail,
          address: {
            county: recipientCounty,
            locality: recipientCity,
            street: recipientStreet,
            streetNo: recipientStreetNo,
            zipCode: recipientZipCode,
          },
        },
      },
    ],
  };

  const awbResponse = await fanPost("/intern-awb", token, awbPayload);
  console.log("FAN intern-awb response:", JSON.stringify(awbResponse, null, 2));

  const awb = extractAwb(awbResponse);
  console.log("Extracted AWB:", awb);

  if (!awb) {
    throw new Error(
      `FAN nu a returnat AWB valid. Răspuns intern-awb: ${JSON.stringify(awbResponse)}`,
    );
  }

  const orderPayload: Record<string, unknown> = {
    clientId,
    info: {
      awbNumber: awb,
      packages: {
        parcel: input.parcels,
        envelope: input.envelopes,
      },
      weight: input.weight,
      dimensions: {
        length: 10,
        width: 10,
        height: 10,
      },
      orderType: "Standard",
      pickupDate: input.pickupDate,
      pickupHours: {
        first: input.pickupFrom,
        second: input.pickupTo,
      },
      observations: input.observations || "",
    },
    sender: {
      name: input.customerName,
      contactPerson: input.customerName,
      email: input.email,
      phone: input.phone,
      address: {
        county: input.county,
        locality: input.city,
        street: input.street,
        streetNo: input.streetNumber,
        zipCode: input.zipCode,
      },
    },
  };

  const orderResponse = await fanPost("/order", token, orderPayload);
  console.log("FAN order response:", JSON.stringify(orderResponse, null, 2));

  return {
    awb,
    awbResponse,
    orderResponse,
  };
}
