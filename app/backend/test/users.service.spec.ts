import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException, BadRequestException } from "@nestjs/common";
import { UsersService } from "../src/modules/users/users.service.js";
import { auth } from "../src/auth/auth.config.js";

describe("UsersService Unit Tests", () => {
  let service: UsersService;
  let mockUserRepo: any;
  let mockFacilityRepo: any;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findOneBy: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    mockFacilityRepo = {
      findOneBy: vi.fn(),
    };
    mockAuditRepo = {
      create: vi.fn().mockImplementation((val) => val),
      save: vi.fn().mockResolvedValue({}),
    };

    service = new UsersService(mockUserRepo, mockFacilityRepo, mockAuditRepo);
  });

  describe("createUser", () => {
    it("allows ADMIN to create any role (e.g. NAKES)", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce(null); // username free
      mockFacilityRepo.findOneBy.mockResolvedValueOnce({ id: "fac-1" });
      const spyCreateUser = vi.spyOn(auth.api, "createUser").mockResolvedValueOnce({
        user: { id: "u-new" } as any,
      } as any);

      const res = await service.createUser(
        { id: "admin-1", role: "ADMIN" },
        {
          username: "nakes_andi",
          password: "password123",
          fullName: "dr. Andi",
          role: "NAKES",
          facilityId: "fac-1",
        },
      );

      expect(res.id).toBe("u-new");
      expect(res.role).toBe("NAKES");
      expect(spyCreateUser).toHaveBeenCalled();
    });

    it("allows NAKES to create PASIEN for their facility", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce(null);
      const spyCreateUser = vi.spyOn(auth.api, "createUser").mockResolvedValueOnce({
        user: { id: "u-pasien" } as any,
      } as any);

      const res = await service.createUser(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        {
          username: "pasien_test",
          password: "password123",
          fullName: "Pasien Test",
          role: "PASIEN",
        },
      );

      expect(res.id).toBe("u-pasien");
      expect(res.facilityId).toBe("fac-1");
      expect(spyCreateUser).toHaveBeenCalled();
    });

    it("forbids NAKES from creating another NAKES", async () => {
      await expect(
        service.createUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          {
            username: "nakes_dua",
            password: "password123",
            fullName: "dr. Dua",
            role: "NAKES",
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from creating an ADMIN", async () => {
      await expect(
        service.createUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          {
            username: "admin_palsu",
            password: "password123",
            fullName: "Admin Palsu",
            role: "ADMIN",
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects duplicate username", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({ id: "existing-u" });

      await expect(
        service.createUser(
          { id: "admin-1", role: "ADMIN" },
          {
            username: "existing_user",
            password: "password123",
            fullName: "Dupe User",
            role: "PASIEN",
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("changeOwnPassword", () => {
    it("rejects when current password does not match", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({ id: "user-1" });

      const ctx = await auth.$context;
      vi.spyOn(ctx.internalAdapter, "findCredentialAccount").mockResolvedValueOnce({
        userId: "user-1",
        password: "hashed_old_password",
      } as any);
      vi.spyOn(ctx.password, "verify").mockResolvedValueOnce(false);

      await expect(
        service.changeOwnPassword("user-1", {
          currentPassword: "wrong_password",
          newPassword: "new_password_123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("updates password when current password matches", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({ id: "user-1" });

      const ctx = await auth.$context;
      vi.spyOn(ctx.internalAdapter, "findCredentialAccount").mockResolvedValueOnce({
        userId: "user-1",
        password: "hashed_old_password",
      } as any);
      vi.spyOn(ctx.password, "verify").mockResolvedValueOnce(true);
      vi.spyOn(ctx.password, "hash").mockResolvedValueOnce("hashed_new_password" as any);
      const spyUpdatePassword = vi
        .spyOn(ctx.internalAdapter, "updatePassword")
        .mockResolvedValueOnce(undefined as any);

      const res = await service.changeOwnPassword("user-1", {
        currentPassword: "correct_password",
        newPassword: "new_password_123",
      });

      expect(res.success).toBe(true);
      expect(spyUpdatePassword).toHaveBeenCalledWith("user-1", "hashed_new_password");
    });
  });

  describe("resetUserPassword", () => {
    it("allows ADMIN to reset any user password", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "target-1",
        role: "NAKES",
        username: "nakes_andi",
      });

      const ctx = await auth.$context;
      vi.spyOn(ctx.password, "hash").mockResolvedValueOnce("hashed_reset_pw" as any);
      const spyUpdatePassword = vi
        .spyOn(ctx.internalAdapter, "updatePassword")
        .mockResolvedValueOnce(undefined as any);

      const res = await service.resetUserPassword(
        { id: "admin-1", role: "ADMIN" },
        "target-1",
        { newPassword: "new_password_123" },
      );

      expect(res.success).toBe(true);
      expect(spyUpdatePassword).toHaveBeenCalledWith("target-1", "hashed_reset_pw");
    });

    it("allows NAKES to reset PASIEN in the same facility", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "pasien-1",
        role: "PASIEN",
        facilityId: "fac-1",
        username: "pasien_budi",
      });

      const ctx = await auth.$context;
      vi.spyOn(ctx.password, "hash").mockResolvedValueOnce("hashed_reset_pw" as any);
      const spyUpdatePassword = vi
        .spyOn(ctx.internalAdapter, "updatePassword")
        .mockResolvedValueOnce(undefined as any);

      const res = await service.resetUserPassword(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "pasien-1",
        { newPassword: "new_password_123" },
      );

      expect(res.success).toBe(true);
      expect(spyUpdatePassword).toHaveBeenCalledWith("pasien-1", "hashed_reset_pw");
    });

    it("forbids NAKES from resetting another NAKES password", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "nakes-2",
        role: "NAKES",
        facilityId: "fac-1",
        username: "nakes_dua",
      });

      await expect(
        service.resetUserPassword(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "nakes-2",
          { newPassword: "new_password_123" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from resetting PASIEN in a different facility", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "pasien-2",
        role: "PASIEN",
        facilityId: "fac-other",
        username: "pasien_other",
      });

      await expect(
        service.resetUserPassword(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "pasien-2",
          { newPassword: "new_password_123" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids PASIEN or PMO from resetting other accounts", async () => {
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "target-1",
        role: "PASIEN",
        username: "target_user",
      });

      await expect(
        service.resetUserPassword(
          { id: "pasien-1", role: "PASIEN" },
          "target-1",
          { newPassword: "new_password_123" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
