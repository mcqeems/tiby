import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository, type FindOptionsWhere } from "typeorm";
import { Facility } from "../entities/facilities.entity.js";
import type {
  CreateFacilityDto,
  UpdateFacilityDto,
  FacilityItem,
  FacilityListResponse,
  ListFacilitiesQuery,
} from "@tiby/ts-shared";

export interface FacilityCaller {
  id: string;
  role: string;
  facilityId?: string | null;
}

function toItem(f: Facility): FacilityItem {
  return {
    id: f.id,
    code: f.code,
    name: f.name,
    district: f.district,
    emergencyPhone: f.emergencyPhone,
    createdAt: f.createdAt.toISOString(),
  };
}

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
  ) {}

  /** Every authenticated role may read the full facility list. */
  async listFacilities(
    query: ListFacilitiesQuery,
  ): Promise<FacilityListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const term = query.search?.trim();
    const where: FindOptionsWhere<Facility>[] = term
      ? [
          { code: ILike(`%${term}%`) },
          { name: ILike(`%${term}%`) },
          { district: ILike(`%${term}%`) },
        ]
      : [];

    const [facilities, total] = await this.facilityRepo.findAndCount({
      where,
      // `id` tie-break keeps offset pages stable when names tie.
      order: { name: "ASC", id: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: facilities.map(toItem), total, page, limit };
  }

  async getFacility(id: string): Promise<FacilityItem> {
    const facility = await this.facilityRepo.findOneBy({ id });
    if (!facility) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Facility not found",
      });
    }
    return toItem(facility);
  }

  async createFacility(dto: CreateFacilityDto): Promise<FacilityItem> {
    const clash = await this.facilityRepo.findOneBy({ code: dto.code });
    if (clash) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `Facility code '${dto.code}' is already in use`,
      });
    }

    const saved = await this.facilityRepo.save(
      this.facilityRepo.create({
        code: dto.code,
        name: dto.name,
        district: dto.district,
        emergencyPhone: dto.emergencyPhone,
      }),
    );

    return toItem(saved);
  }

  async updateFacility(
    caller: FacilityCaller,
    facilityId: string,
    dto: UpdateFacilityDto,
  ): Promise<FacilityItem> {
    const facility = await this.facilityRepo.findOneBy({ id: facilityId });
    if (!facility) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Facility not found",
      });
    }

    // NAKES may only edit the facility they are assigned to.
    if (caller.role === "NAKES") {
      if (!caller.facilityId || caller.facilityId !== facilityId) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Faskes can only edit their own facility",
        });
      }
    }

    if (dto.code !== undefined && dto.code !== facility.code) {
      const clash = await this.facilityRepo.findOneBy({ code: dto.code });
      if (clash && clash.id !== facilityId) {
        throw new ConflictException({
          code: "CONFLICT",
          message: `Facility code '${dto.code}' is already in use`,
        });
      }
      facility.code = dto.code;
    }

    if (dto.name !== undefined) facility.name = dto.name;
    if (dto.district !== undefined) facility.district = dto.district;
    if (dto.emergencyPhone !== undefined) facility.emergencyPhone = dto.emergencyPhone;

    return toItem(await this.facilityRepo.save(facility));
  }

  async deleteFacility(facilityId: string): Promise<{ success: boolean; message: string }> {
    const facility = await this.facilityRepo.findOneBy({ id: facilityId });
    if (!facility) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Facility not found",
      });
    }

    await this.facilityRepo.delete({ id: facilityId });

    return { success: true, message: `Facility '${facility.name}' deleted` };
  }
}
