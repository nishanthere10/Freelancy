import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas,#f8fafc)] p-4 sm:p-8">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Freelance OS
          </h1>
          <p className="text-sm text-gray-600">
            Sign in to manage your freelance operations
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              card: 'shadow-xl border border-[var(--color-hairline,#e2e8f0)] rounded-2xl bg-white',
              formButtonPrimary:
                'bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold',
              footerActionLink:
                'text-amber-600 hover:text-amber-700 font-medium',
            },
          }}
        />
      </div>
    </div>
  );
}
