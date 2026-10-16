import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import {
  EducationQuerySchema,
  type EducationQuery,
  type EducationCardList,
} from "@tiby/ts-shared";

const EDUCATIONAL_CARDS = [
  {
    id: "card-intensif-01",
    title: "Mengapa Obat Harus Diminum Setiap Hari Tanpa Putus?",
    summary: "Konsistensi adalah kunci utama kesembuhan total dan pencegahan kekebalan obat.",
    contentMarkdown: `### Disiplin Minum Obat Bersama Pandu
Terapi pengobatan membutuhkan waktu beberapa bulan agar kuman dapat dihilangkan secara menyeluruh. Meminum obat secara teratur setiap hari menjaga kadar obat tetap optimal di dalam tubuh.

**Tips Sehari-hari:**
- Tetapkan alarm harian pada jam yang sama setiap pagi atau malam.
- Minta PMO (Pendamping Minum Obat) untuk saling menyemangati.
- Jika ada keluhan ringan, segera laporkan lewat fitur check-in Pandu.`,
    category: "ADHERENCE",
    phase: "INTENSIF",
  },
  {
    id: "card-intensif-02",
    title: "Mengenal Perubahan Warna Air Seni yang Wajar",
    summary: "Warna air kencing kemerahan atau oranye adalah tanda alami salah satu obat bekerja.",
    contentMarkdown: `### Air Seni Berwarna Kemerahan?
Jangan khawatir! Salah satu komponen obat (Rifampisin) memang secara alami menyebabkan air seni, keringat, atau air mata berwarna merah atau oranye.

Ini adalah efek samping yang **sangat wajar dan tidak berbahaya**. Tetap minum air putih yang cukup dan lanjutkan minum obat sesuai anjuran petugas kesehatan.`,
    category: "SIDE_EFFECTS",
    phase: "INTENSIF",
  },
  {
    id: "card-lanjutan-01",
    title: "Memasuki Tahap Lanjutan: Jangan Lengah!",
    summary: "Badan sudah terasa segar, namun pengobatan harus dituntaskan hingga tuntas.",
    contentMarkdown: `### Selamat Memasuki Tahap Lanjutan!
Banyak sahabat Pandu merasa tubuhnya sudah sehat pada tahap ini. Namun, kuman yang sedang 'tertidur' harus dipastikan benar-benar tuntas.

Tetaplah bersemangat dan rutin menyelesaikan jadwal terapi Anda bersama Pandu hingga dinyatakan tuntas oleh dokter puskesmas!`,
    category: "ADHERENCE",
    phase: "LANJUTAN",
  },
];

@Controller("education")
@UseGuards(RolesGuard)
export class EducationController {
  @Get("daily")
  @Roles(["PASIEN", "PMO"])
  getDailyCards(@Query({ schema: EducationQuerySchema }) query: EducationQuery): EducationCardList {
    if (query.phase) {
      return {
        cards: EDUCATIONAL_CARDS.filter((c) => c.phase === query.phase),
      };
    }
    return { cards: EDUCATIONAL_CARDS };
  }
}
