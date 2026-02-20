import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Response } from "express";

@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check(@Res() res: Response) {
    // ⚕️ HUMAN CHECK - Observabilidad (H-23): Verificación real del estado de dependencias
    const dbStatus = this.connection.readyState === 1 ? "up" : "down";

    const isHealthy = dbStatus === "up";

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        status: isHealthy ? "ok" : "error",
        info: {
          database: { status: dbStatus },
        },
        timestamp: new Date().toISOString(),
      });
  }
}
