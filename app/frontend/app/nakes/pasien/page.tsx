"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import PatientsTable from "./components/patients-table";

export default function NakesPasienPage() {
  return (
    <div className="space-y-6">
      

      <PatientsTable />
    </div>
  );
}
