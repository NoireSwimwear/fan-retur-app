"use client";

import { useState } from "react";

export default function ReturnsPage() {
  const [form, setForm] = useState({
    orderNumber: "",
    customerName: "",
    phone: "",
    email: "",
    county: "",
    city: "",
    street: "",
    streetNumber: "",
    zipCode: "",
    parcels: "1",
    envelopes: "0",
    weight: "1",
    pickupDate: "",
    pickupFrom: "",
    pickupTo: "",
    observations: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/returns/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const raw = await res.text();

      let json: Record<string, unknown> | null = null;
      try {
        json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch {
        throw new Error(raw || "Răspuns invalid de la server.");
      }

      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Eroare la salvare.",
        );
      }

      const idText = typeof json?.id === "number" ? json.id : "-";
      const awbText = typeof json?.awb === "string" ? json.awb : "";

      setMessage(
        awbText
          ? `Succes! Returul a fost salvat cu ID: ${idText}. AWB: ${awbText}`
          : `Succes! Returul a fost salvat cu ID: ${idText}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "A apărut o eroare.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-bold">Test Retur</h1>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <input
            className="border p-3"
            placeholder="Număr comandă"
            value={form.orderNumber}
            onChange={(e) => updateField("orderNumber", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Nume client"
            value={form.customerName}
            onChange={(e) => updateField("customerName", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Județ"
            value={form.county}
            onChange={(e) => updateField("county", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Oraș"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Stradă"
            value={form.street}
            onChange={(e) => updateField("street", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Număr stradă"
            value={form.streetNumber}
            onChange={(e) => updateField("streetNumber", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Cod poștal"
            value={form.zipCode}
            onChange={(e) => updateField("zipCode", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Colete"
            value={form.parcels}
            onChange={(e) => updateField("parcels", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Plicuri"
            value={form.envelopes}
            onChange={(e) => updateField("envelopes", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Greutate"
            value={form.weight}
            onChange={(e) => updateField("weight", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Data ridicare (YYYY-MM-DD)"
            value={form.pickupDate}
            onChange={(e) => updateField("pickupDate", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Pickup de la (HH:mm)"
            value={form.pickupFrom}
            onChange={(e) => updateField("pickupFrom", e.target.value)}
          />
          <input
            className="border p-3"
            placeholder="Pickup până la (HH:mm)"
            value={form.pickupTo}
            onChange={(e) => updateField("pickupTo", e.target.value)}
          />
          <textarea
            className="border p-3"
            placeholder="Observații"
            value={form.observations}
            onChange={(e) => updateField("observations", e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Se trimite..." : "Trimite"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded bg-neutral-100 p-3 text-sm">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}