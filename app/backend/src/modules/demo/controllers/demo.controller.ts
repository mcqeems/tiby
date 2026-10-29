import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  SerializeOptions,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import {
  DemoEndResponseSchema,
  DemoEnterResponseSchema,
  DemoEnterSchema,
  type DemoEnterDto,
  DemoStartResponseSchema,
  DemoStatusSchema,
} from "@tiby/ts-shared";
import { DemoService, DEMO_COOKIE, DEMO_TTL_MS } from "../services/demo.service.js";

@Controller("demo")
@AllowAnonymous()
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  private setDemoCookie(res: Response, token: string): void {
    res.cookie(DEMO_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: DEMO_TTL_MS,
      path: "/api/demo",
    });
  }

  @Get("status")
  @SerializeOptions({ schema: DemoStatusSchema })
  async status(@Req() req: Request) {
    return this.demoService.status(this.demoService.readToken(req));
  }

  @Post("start")
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: DemoStartResponseSchema })
  async start(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const token = this.demoService.readToken(req);
    const existing = await this.demoService.status(token);
    if (existing.active && existing.expiresAt) {
      return { expiresAt: existing.expiresAt };
    }
    const { token: fresh, expiresAt } = await this.demoService.create(ip);
    this.setDemoCookie(res, fresh);
    return { expiresAt };
  }

  @Post("enter")
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: DemoEnterResponseSchema })
  async enter(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body({ schema: DemoEnterSchema }) body: DemoEnterDto,
  ) {
    const { role, setCookie } = await this.demoService.enter(
      this.demoService.readToken(req),
      body.role,
      req.headers,
    );
    if (setCookie.length > 0) res.setHeader("Set-Cookie", setCookie);
    return { role };
  }

  @Post("end")
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: DemoEndResponseSchema })
  async end(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.demoService.end(this.demoService.readToken(req));
    res.clearCookie(DEMO_COOKIE, { path: "/api/demo" });
    return result;
  }
}
