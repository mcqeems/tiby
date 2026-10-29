import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { UsersService } from "../src/modules/users/services/users.service.js";
import { auth } from "../src/auth/auth.config.js";

describe("UsersService Unit Tests", () => {
  let service: UsersService;
  let mockUserRepo: any;
  let mockFacilityRepo: any;
  let mockAuditRepo: any;
  let mockStorageService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUserRepo = {
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
    };
    mockFacilityRepo = {
      findOneBy: vi.fn(),
    };
    mockAuditRepo = {
      create: vi.fn().mockImplementation((val) => val),
      save: vi.fn().mockResolvedValue({}),
    };
    mockStorageService = {
      putObject: vi.fn(),
      deleteObject: vi.fn(),
      buildPublicUrl: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue("profile-pictures/"),
    };

    service = new UsersService(
      mockUserRepo,
      mockFacilityRepo,
      mockAuditRepo,
      mockStorageService,
      mockConfigService,
    );
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

    it("forbids a facility-less NAKES from resetting a facility-less account", async () => {
      // Regression: `target.facilityId === caller.facilityId` is true for null === null.
      mockUserRepo.findOneBy.mockResolvedValueOnce({
        id: "pasien-orphan",
        role: "PASIEN",
        facilityId: null,
        username: "pasien_orphan",
      });

      await expect(
        service.resetUserPassword(
          { id: "nakes-1", role: "NAKES", facilityId: null },
          "pasien-orphan",
          { newPassword: "new_password_123" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateUser", () => {
    function mockTarget(overrides: Record<string, unknown> = {}) {
      const target = {
        id: "pasien-1",
        role: "PASIEN",
        facilityId: "fac-1",
        username: "pasien_budi",
        email: "budi@users.tiby.internal",
        name: "Budi",
        ...overrides,
      };
      mockUserRepo.findOne.mockResolvedValueOnce(target);
      return target;
    }

    it("allows ADMIN to edit any user and writes through the auth adapter", async () => {
      mockTarget({ role: "NAKES" });
      const ctx = await auth.$context;
      const spyUpdateUser = vi
        .spyOn(ctx.internalAdapter, "updateUser")
        .mockResolvedValue({} as any);
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: "nakes-2",
        username: "nakes_dua",
        email: "n@x",
        name: "Nakes Dua",
        role: "NAKES",
        facilityId: "fac-1",
        facility: { name: "Puskesmas A" },
      });

      const res = await service.updateUser(
        { id: "admin-1", role: "ADMIN" },
        "nakes-2",
        { fullName: "Nakes Baru", whatsappNumber: "0812999" },
      );

      expect(spyUpdateUser).toHaveBeenCalledWith(
        "nakes-2",
        expect.objectContaining({
          name: "Nakes Baru",
          full_name_encrypted: "Nakes Baru",
          whatsapp_encrypted: "0812999",
        }),
      );
      expect(res.facility).toBe("Puskesmas A");
    });

    it("allows NAKES to edit PASIEN in their facility", async () => {
      mockTarget();
      const ctx = await auth.$context;
      const spyUpdateUser = vi
        .spyOn(ctx.internalAdapter, "updateUser")
        .mockResolvedValue({} as any);
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: "pasien-1",
        username: "pasien_budi",
        email: "b@x",
        name: "Budi Baru",
        role: "PASIEN",
        facilityId: "fac-1",
        facility: null,
      });

      await service.updateUser(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "pasien-1",
        { fullName: "Budi Baru" },
      );

      expect(spyUpdateUser).toHaveBeenCalledWith(
        "pasien-1",
        expect.objectContaining({ name: "Budi Baru" }),
      );
    });

    it("forbids NAKES from editing users in another facility", async () => {
      mockTarget({ facilityId: "fac-other" });

      await expect(
        service.updateUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "pasien-1",
          { fullName: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from editing another NAKES (same or higher role)", async () => {
      mockTarget({ role: "NAKES" });

      await expect(
        service.updateUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "nakes-2",
          { fullName: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from promoting a PASIEN to NAKES", async () => {
      mockTarget();

      await expect(
        service.updateUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "pasien-1",
          { role: "NAKES" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from moving a user to another facility", async () => {
      mockTarget();

      await expect(
        service.updateUser(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "pasien-1",
          { facilityId: "fac-other" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows NAKES to switch PASIEN to PMO", async () => {
      mockTarget();
      const ctx = await auth.$context;
      const spyUpdateUser = vi
        .spyOn(ctx.internalAdapter, "updateUser")
        .mockResolvedValue({} as any);
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: "pasien-1",
        username: "pasien_budi",
        email: "b@x",
        name: "Budi",
        role: "PMO",
        facilityId: "fac-1",
        facility: null,
      });

      await service.updateUser(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "pasien-1",
        { role: "PMO" },
      );

      expect(spyUpdateUser).toHaveBeenCalledWith(
        "pasien-1",
        expect.objectContaining({ role: "PMO" }),
      );
    });

    it("forbids PASIEN and PMO from editing anyone", async () => {
      mockTarget();

      await expect(
        service.updateUser(
          { id: "pasien-9", role: "PASIEN" },
          "pasien-1",
          { fullName: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects an email that is already in use", async () => {
      mockTarget();
      mockUserRepo.findOneBy.mockResolvedValueOnce({ id: "someone-else" });

      await expect(
        service.updateUser(
          { id: "admin-1", role: "ADMIN" },
          "pasien-1",
          { email: "taken@users.tiby.internal" },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an unknown facility id", async () => {
      mockTarget({ role: "NAKES" });
      mockFacilityRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.updateUser(
          { id: "admin-1", role: "ADMIN" },
          "nakes-2",
          { facilityId: "00000000-0000-0000-0000-000000000000" },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when the target does not exist", async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateUser(
          { id: "admin-1", role: "ADMIN" },
          "ghost",
          { fullName: "Nope" },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("listUsers", () => {
    it("scopes NAKES to their facility and paginates", async () => {
      await service.listUsers(
        { id: "nakes-1", role: "NAKES", facilityId: "faskes-1" },
        { page: 2, limit: 10 } as any,
      );

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        where: [{ facilityId: "faskes-1" }],
        relations: { facility: true },
        order: { createdAt: "DESC", id: "DESC" },
        skip: 10,
        take: 10,
      });
    });

    it("does not scope ADMIN to a facility", async () => {
      await service.listUsers({ id: "admin-1", role: "ADMIN" }, {} as any);

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        where: [{ demoSessionId: expect.anything() }],
        relations: { facility: true },
        order: { createdAt: "DESC", id: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("filters by a role list", async () => {
      await service.listUsers({ id: "admin-1", role: "ADMIN" }, {
        role: ["NAKES", "ADMIN"],
      } as any);

      const where = mockUserRepo.findAndCount.mock.calls[0][0].where;
      expect(where[0].role.value).toEqual(["NAKES", "ADMIN"]);
    });

    it("returns an empty page for a NAKES without a facility", async () => {
      const res = await service.listUsers(
        { id: "nakes-1", role: "NAKES", facilityId: null },
        {} as any,
      );

      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(mockUserRepo.findAndCount).not.toHaveBeenCalled();
    });

    it("maps the joined facility name onto the summary", async () => {
      mockUserRepo.findAndCount.mockResolvedValue([
        [
          {
            id: "u-1",
            username: "budi",
            email: "b@x",
            name: "Budi",
            role: "PASIEN",
            facilityId: "faskes-1",
            facility: { name: "Puskesmas Gampang" },
          },
        ],
        1,
      ]);

      const res = await service.listUsers(
        { id: "admin-1", role: "ADMIN" },
        {} as any,
      );

      expect(res.total).toBe(1);
      expect(res.items[0].facility).toBe("Puskesmas Gampang");
    });
  });
  describe("listUsers filtering", () => {
    it("searches name, username and email", async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(
        { id: "admin-1", role: "ADMIN" },
        { search: "budi" } as any,
      );

      const where = mockUserRepo.findAndCount.mock.calls[0][0].where;
      expect(where).toHaveLength(3);
      expect(where[0].name.value).toBe("%budi%");
      expect(where[1].username.value).toBe("%budi%");
      expect(where[2].email.value).toBe("%budi%");
    });

    it("applies an ADMIN facility filter", async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(
        { id: "admin-1", role: "ADMIN" },
        { facilityId: "faskes-9" } as any,
      );

      const where = mockUserRepo.findAndCount.mock.calls[0][0].where;
      expect(where[0]).toEqual({
        facilityId: "faskes-9",
        demoSessionId: expect.anything(),
      });
    });

    it("forbids a NAKES from filtering by another facility", async () => {
      await expect(
        service.listUsers(
          { id: "nakes-1", role: "NAKES", facilityId: "faskes-1" },
          { facilityId: "faskes-9" } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepo.findAndCount).not.toHaveBeenCalled();
    });
  });
});
