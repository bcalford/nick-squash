export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
