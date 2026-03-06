import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createFanAwb } from "@/lib/fan";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const savedReturn = await prisma.return.create({
      data: {
        orderNumber: body.orderNumber,
        customerName: body.customerName,
        phone: body.phone,
        email: body.email,
        county: body.county,
        city: body.city,
        street: body.street,
        streetNumber: body.streetNumber,
        zipCode: body.zipCode,
        parcels: Number(body.parcels || 1),
        envelopes: Number(body.envelopes || 0),
        weight: Number(body.weight || 1),
        pickupDate: body.pickupDate,
        pickupFrom: body.pickupFrom,
        pickupTo: body.pickupTo,
        observations: body.observations || null,
        status: "pending",
      },
    });

    try {
      const fanResult = await createFanAwb({
        customerName: body.customerName,
        phone: body.phone,
        email: body.email,
        county: body.county,
        city: body.city,
        street: body.street,
        streetNumber: body.streetNumber,
        zipCode: body.zipCode,
        parcels: Number(body.parcels || 1),
        envelopes: Number(body.envelopes || 0),
        weight: Number(body.weight || 1),
        pickupDate: body.pickupDate,
        pickupFrom: body.pickupFrom,
        pickupTo: body.pickupTo,
        observations: body.observations || "",
        orderNumber: body.orderNumber,
      });

      const updatedReturn = await prisma.return.update({
        where: { id: savedReturn.id },
        data: {
          awb: fanResult.awb,
          fanResponse: toJsonValue({
            awbResponse: fanResult.awbResponse,
            orderResponse: fanResult.orderResponse,
          }),
          status: fanResult.awb ? "awb_created" : "pending",
        },
      });

      return NextResponse.json({
        ok: true,
        id: updatedReturn.id,
        awb: updatedReturn.awb,
        message: "Programarea ridicării a fost efectuată.",
      });
    } catch (fanError) {
      const fanMessage =
        fanError instanceof Error ? fanError.message : "Eroare la FAN Courier.";

      await prisma.return.update({
        where: { id: savedReturn.id },
        data: {
          status: "fan_error",
          fanResponse: toJsonValue({
            error: fanMessage,
          }),
        },
      });

      return NextResponse.json(
        {
          ok: false,
          id: savedReturn.id,
          error: fanMessage,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Create return error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Nu am putut procesa cererea de retur.",
      },
      { status: 500 },
    );
  }
}
