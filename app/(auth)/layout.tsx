import { BellRing } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <BellRing className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PayRemind</h1>
          <p className="text-gray-600 mt-1 text-sm">Cobros automáticos para freelancers</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
