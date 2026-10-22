import EducationView from "@/app/pasien/edukasi/components/education-view";

export default function PmoEdukasiPage() {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Panggil komponen yang sama, tapi oper role="PMO" */}
      <EducationView role="PMO" />
    </div>
  );
}
