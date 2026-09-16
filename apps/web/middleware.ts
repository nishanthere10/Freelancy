import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/signin(.*)',
  '/signup(.*)',
  '/login(.*)',
  '/register(.*)',
  '/api/(.*)',
  '/__clerk(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/signin(.*)',
  '/signup(.*)',
  '/login(.*)',
  '/register(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Let Clerk dev-browser handshakes and non-GET pass through untouched
  if (request.method !== 'GET') {
    return NextResponse.next();
  }

  if (
    request.nextUrl.searchParams.has('__clerk_handshake') ||
    request.nextUrl.pathname.startsWith('/__clerk')
  ) {
    return NextResponse.next();
  }

  const { userId, redirectToSignIn } = await auth();

  // Authenticated user hitting an auth page → bounce to /workspaces
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL('/workspaces', request.url));
  }

  // Unauthenticated user hitting a protected page → redirect to /sign-in
  if (!isPublicRoute(request) && !userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|png|jpg|jpeg|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

