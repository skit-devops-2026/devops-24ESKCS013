export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Login</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Enter your credentials to access your portal</p>
        </div>
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Email</label>
            <input type="email" placeholder="student@example.com" className="w-full px-3 py-2 border rounded-md border-zinc-200 bg-transparent text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Password</label>
            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border rounded-md border-zinc-200 bg-transparent text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300" />
          </div>
          <button type="button" className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
