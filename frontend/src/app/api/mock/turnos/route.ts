import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    {
      id: "1",
      fullName: "Demo Patient",
      office: "1",
      timestamp: Date.now(),
    },
    {
      id: "2",
      fullName: "Demo Patient 2",
      office: "2",
      timestamp: Date.now(),
    },
    {
      id: "3",
      fullName: "Demo Patient 3",
      office: "3",
      timestamp: Date.now(),
    },
  ];

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.fullName || !body?.idCard) {
      return NextResponse.json(
        {
          status: "error",
          message: "Incomplete data",
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      status: "accepted",
      message: "Appointment registered successfully",
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Error processing request",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
