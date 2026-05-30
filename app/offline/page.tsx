"use client";

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      dir="auto"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600"
        >
          <line x1="1" x2="23" y1="1" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" x2="12.01" y1="20" y2="20" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold">
        <span lang="ar">أنت غير متصل بالإنترنت</span>
        <span className="mx-2">—</span>
        <span lang="en">You are offline</span>
      </h1>
      <p className="text-muted-foreground max-w-md">
        <span lang="ar">بعض المحتوى متاح بدون اتصال.</span>{" "}
        <span lang="en">Some content is available offline.</span>
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
      >
        <span lang="ar">حاول مرة أخرى</span> / <span lang="en">Try Again</span>
      </button>
    </div>
  );
}
