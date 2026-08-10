'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function NavigationWrapper() {
  const pathname = usePathname();
  
  // Hide the application navbar on the marketing landing page
  if (pathname === '/') {
    return null;
  }
  
  return <Navbar />;
}
