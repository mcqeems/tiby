import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { EducationCard } from "../entities/education-card.entity.js";
import type {
  EducationCardList,
  EducationQuery,
  EducationCardManaged,
  EducationCardManagedList,
  EducationListQuery,
  CreateEducationCardDto,
  UpdateEducationCardDto,
  EducationCategory,
  TreatmentPhase,
} from "@tiby/ts-shared";

export interface EducationCaller {
  id: string;
  role: string;
  facilityId?: string | null;
}

/** Global (ADMIN-owned) defaults seeded on first boot. */
const DEFAULT_CARDS: Array<
  Pick<
    EducationCard,
    "title" | "summary" | "contentMarkdown" | "category" | "phase" | "sortOrder"
  >
> = [
  {
    title: "Mengapa Obat Harus Diminum Setiap Hari Tanpa Putus?",
    summary:
      "Konsistensi adalah kunci utama kesembuhan total dan pencegahan kekebalan obat.",
    contentMarkdown: `### Disiplin Minum Obat Bersama Pandu
Terapi pengobatan membutuhkan waktu beberapa bulan agar kuman dapat dihilangkan secara menyeluruh. Meminum obat secara teratur setiap hari menjaga kadar obat tetap optimal di dalam tubuh.

**Tips Sehari-hari:**
- Tetapkan alarm harian pada jam yang sama setiap pagi atau malam.
- Minta PMO (Pendamping Minum Obat) untuk saling menyemangati.
- Jika ada keluhan ringan, segera laporkan lewat fitur check-in Pandu.`,
    category: "ADHERENCE",
    phase: "INTENSIF",
    sortOrder: 0,
  },
  {
    title: "Mengenal Perubahan Warna Air Seni yang Wajar",
    summary:
      "Warna air kencing kemerahan atau oranye adalah tanda alami salah satu obat bekerja.",
    contentMarkdown: `### Air Seni Berwarna Kemerahan?
Jangan khawatir! Salah satu komponen obat (Rifampisin) memang secara alami menyebabkan air seni, keringat, atau air mata berwarna merah atau oranye.

Ini adalah efek samping yang **sangat wajar dan tidak berbahaya**. Tetap minum air putih yang cukup dan lanjutkan minum obat sesuai anjuran petugas kesehatan.`,
    category: "SIDE_EFFECTS",
    phase: "INTENSIF",
    sortOrder: 1,
  },
  {
    title: "Memasuki Tahap Lanjutan: Jangan Lengah!",
    summary:
      "Badan sudah terasa segar, namun pengobatan harus dituntaskan hingga tuntas.",
    contentMarkdown: `### Selamat Memasuki Tahap Lanjutan!
Banyak sahabat Pandu merasa tubuhnya sudah sehat pada tahap ini. Namun, kuman yang sedang 'tertidur' harus dipastikan benar-benar tuntas.

Tetaplah bersemangat dan rutin menyelesaikan jadwal terapi Anda bersama Pandu hingga dinyatakan tuntas oleh dokter puskesmas!`,
    category: "ADHERENCE",
    phase: "LANJUTAN",
    sortOrder: 0,
  },
];

function toManaged(card: EducationCard): EducationCardManaged {
  return {
    id: card.id,
    facilityId: card.facilityId,
    title: card.title,
    summary: card.summary,
    contentMarkdown: card.contentMarkdown,
    category: card.category as EducationCategory,
    phase: card.phase as TreatmentPhase,
    sortOrder: card.sortOrder,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

@Injectable()
export class EducationService implements OnModuleInit {
  private readonly logger = new Logger(EducationService.name);

  constructor(
    @InjectRepository(EducationCard)
    private readonly cardRepo: Repository<EducationCard>,
  ) {}

  /**
   * Seed the global defaults once so a fresh database still serves content.
   * ponytail: count-then-insert races if two instances boot together; add a
   * unique (facility_id, title) constraint if that ever happens.
   */
  async onModuleInit(): Promise<void> {
    const existing = await this.cardRepo.countBy({ facilityId: IsNull() });
    if (existing > 0) return;

    await this.cardRepo.save(
      DEFAULT_CARDS.map((c) =>
        this.cardRepo.create({ ...c, facilityId: null, createdByUserId: null }),
      ),
    );
    this.logger.log(`Seeded ${DEFAULT_CARDS.length} global education cards`);
  }

  /** Patient/PMO feed: global cards plus their own facility's cards. */
  async getDailyCards(
    query: EducationQuery,
    facilityId?: string | null,
  ): Promise<EducationCardList> {
    // Global (facilityId IS NULL) cards are always visible; facility cards too.
    const scope = facilityId
      ? [{ facilityId: IsNull() }, { facilityId }]
      : [{ facilityId: IsNull() }];

    const cards = await this.cardRepo.find({
      where: scope.map((s) => ({
        ...s,
        ...(query.phase ? { phase: query.phase } : {}),
      })),
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });

    return {
      cards: cards.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        contentMarkdown: c.contentMarkdown,
        category: c.category as EducationCategory,
        phase: c.phase as TreatmentPhase,
      })),
    };
  }

  /** Admin/Nakes listing. ADMIN sees everything; NAKES sees global + own. */
  async listCards(
    caller: EducationCaller,
    query: EducationListQuery,
  ): Promise<EducationCardManagedList> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const pagination = {
      // `id` breaks ties so a page boundary never repeats or drops a card.
      order: {
        facilityId: "ASC",
        sortOrder: "ASC",
        createdAt: "ASC",
        id: "ASC",
      } as const,
      skip: (page - 1) * limit,
      take: limit,
    };

    let rows: EducationCard[];
    let total: number;

    if (caller.role === "ADMIN") {
      [rows, total] = await this.cardRepo.findAndCount(pagination);
    } else if (!caller.facilityId) {
      [rows, total] = await this.cardRepo.findAndCount({
        where: { facilityId: IsNull() },
        ...pagination,
      });
    } else {
      [rows, total] = await this.cardRepo.findAndCount({
        where: [{ facilityId: IsNull() }, { facilityId: caller.facilityId }],
        ...pagination,
      });
    }

    return {
      items: rows.map(toManaged),
      total,
      page,
      limit,
    };
  }

  async createCard(
    caller: EducationCaller,
    dto: CreateEducationCardDto,
  ): Promise<EducationCardManaged> {
    const facilityId = this.resolveWriteScope(caller, dto.facilityId ?? null);

    const saved = await this.cardRepo.save(
      this.cardRepo.create({
        facilityId,
        title: dto.title,
        summary: dto.summary,
        contentMarkdown: dto.contentMarkdown,
        category: dto.category,
        phase: dto.phase,
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: caller.id,
      }),
    );

    return toManaged(saved);
  }

  async updateCard(
    caller: EducationCaller,
    cardId: string,
    dto: UpdateEducationCardDto,
  ): Promise<EducationCardManaged> {
    const card = await this.cardRepo.findOneBy({ id: cardId });
    if (!card) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Education card not found",
      });
    }

    this.assertCanWrite(caller, card);

    if (dto.facilityId !== undefined) {
      card.facilityId = this.resolveWriteScope(caller, dto.facilityId);
    }
    if (dto.title !== undefined) card.title = dto.title;
    if (dto.summary !== undefined) card.summary = dto.summary;
    if (dto.contentMarkdown !== undefined) card.contentMarkdown = dto.contentMarkdown;
    if (dto.category !== undefined) card.category = dto.category;
    if (dto.phase !== undefined) card.phase = dto.phase;
    if (dto.sortOrder !== undefined) card.sortOrder = dto.sortOrder;

    return toManaged(await this.cardRepo.save(card));
  }

  async deleteCard(
    caller: EducationCaller,
    cardId: string,
  ): Promise<{ success: boolean; message: string }> {
    const card = await this.cardRepo.findOneBy({ id: cardId });
    if (!card) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Education card not found",
      });
    }

    this.assertCanWrite(caller, card);
    await this.cardRepo.delete({ id: cardId });

    return { success: true, message: "Education card deleted" };
  }

  /** ADMIN may target any scope; NAKES is pinned to their own facility. */
  private resolveWriteScope(
    caller: EducationCaller,
    requested: string | null,
  ): string | null {
    if (caller.role === "ADMIN") return requested;

    if (caller.role === "NAKES") {
      if (!caller.facilityId) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Faskes account is not assigned to a facility",
        });
      }
      if (requested !== null && requested !== caller.facilityId) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Faskes can only manage education cards for their own facility",
        });
      }
      return caller.facilityId;
    }

    throw new ForbiddenException({
      code: "FORBIDDEN",
      message: "Insufficient permissions to manage education cards",
    });
  }

  private assertCanWrite(caller: EducationCaller, card: EducationCard): void {
    if (caller.role === "ADMIN") return;

    if (caller.role === "NAKES") {
      if (card.facilityId === null) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Global education cards can only be edited by an admin",
        });
      }
      if (!caller.facilityId || card.facilityId !== caller.facilityId) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Faskes can only manage education cards for their own facility",
        });
      }
      return;
    }

    throw new ForbiddenException({
      code: "FORBIDDEN",
      message: "Insufficient permissions to manage education cards",
    });
  }
}
