import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600" />
          <span className="text-xl font-bold text-gray-900">Assembler</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/upload" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            New Project
          </Link>
          <span className="text-sm font-medium text-gray-400 cursor-not-allowed">Docs</span>
          <span className="text-sm font-medium text-gray-400 cursor-not-allowed">Sign In</span>
        </nav>
      </div>
    </header>
  );
}
