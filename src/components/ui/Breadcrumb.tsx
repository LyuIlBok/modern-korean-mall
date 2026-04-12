'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex items-center space-x-2 text-[11px] uppercase tracking-widest font-bold text-muted">
        <li className="flex items-center">
          <Link 
            href="/" 
            className="hover:text-charcoal transition-colors flex items-center gap-1.5"
          >
            <Home className="w-3 h-3" />
            <span>HOME</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-border-light flex-shrink-0" />
            {item.href ? (
              <Link 
                href={item.href}
                className="hover:text-charcoal transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-charcoal truncate max-w-[150px] sm:max-w-none">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
