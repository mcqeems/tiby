import type { Metadata } from "next";
import RegisterView from "./components/register-view";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description:
    "Daftar akun Tiby untuk mulai memantau rutinitas sehatmu bersama Pandu.",
  robots: "noindex, nofollow",
};

export default function RegisterPage() {
  return <RegisterView />;
}
