import { describe, it, expect, vi } from "vitest";
import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/common/guards/roles.guard.js";
import { ConsentGuard } from "../src/common/guards/consent.guard.js";

function createMockContext(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("Security Guards Unit Tests", () => {
  describe("RolesGuard", () => {
    let reflector: Reflector;
    let guard: RolesGuard;

    it("allows access when route has no @Roles decorator", () => {
      reflector = { get: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
      guard = new RolesGuard(reflector);

      const ctx = createMockContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("throws ForbiddenException when session/user is missing on protected route", () => {
      reflector = { get: vi.fn().mockReturnValue(["NAKES"]) } as unknown as Reflector;
      guard = new RolesGuard(reflector);

      const ctx = createMockContext({});
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when user role does not match required roles", () => {
      reflector = { get: vi.fn().mockReturnValue(["NAKES"]) } as unknown as Reflector;
      guard = new RolesGuard(reflector);

      const ctx = createMockContext({ user: { role: "PASIEN" } });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it("allows access when user role matches required roles", () => {
      reflector = { get: vi.fn().mockReturnValue(["NAKES", "PMO"]) } as unknown as Reflector;
      guard = new RolesGuard(reflector);

      const ctx = createMockContext({ session: { user: { role: "NAKES" } } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("allows access for ADMIN role with absolute authorization", () => {
      reflector = { get: vi.fn().mockReturnValue(["NAKES"]) } as unknown as Reflector;
      guard = new RolesGuard(reflector);

      const ctx = createMockContext({ session: { user: { role: "ADMIN" } } });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe("ConsentGuard", () => {
    const guard = new ConsentGuard();

    it("allows access when request has no user", () => {
      const ctx = createMockContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("allows access for non-PASIEN roles (e.g. NAKES, PMO)", () => {
      const ctx = createMockContext({ user: { role: "NAKES", mustConfirmConsent: true } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("allows access for PASIEN with confirmed consent", () => {
      const ctx = createMockContext({ user: { role: "PASIEN", mustConfirmConsent: false } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("throws ForbiddenException (CONSENT_REQUIRED) when PASIEN has mustConfirmConsent=true", () => {
      const ctx = createMockContext({ user: { role: "PASIEN", mustConfirmConsent: true } });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
