export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold text-amber-400 tracking-tight">
            Phasio
          </h1>
          <p className="text-sm text-[#888888] mt-1">
            Prompt testing and LLM regression
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
