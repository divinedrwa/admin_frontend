import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-3xl font-bold text-blue-600">?</span>
        </div>

        <div>
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
