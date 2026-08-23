export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Student Portal
        </h1>
        <p className="text-xl text-zinc-500 max-w-md">
          A clean, modern productivity and academic progress tracking application for students.
        </p>
        <div className="flex space-x-4 mt-8">
          <a
            href="/login"
            className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
          </a>
        </div>
      </main>
    </div>
  );
}
