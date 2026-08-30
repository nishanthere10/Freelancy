'use client';

import { motion } from 'framer-motion';
import { SquaresFour, Users, Receipt, Lightning, ArrowUpRight, Plus, ChartBar } from '@phosphor-icons/react';
import Link from 'next/link';

export function FeatureGrid() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="py-[120px] bg-[var(--color-canvas)] border-t border-[var(--color-hairline-soft)]">
      <div className="max-w-[1280px] mx-auto px-8">
        
        <div className="mb-16 max-w-2xl">
          <h2 className="text-[40px] md:text-[48px] font-medium leading-[1.15] tracking-[-0.02em] text-[var(--color-ink)] mb-6">
            Everything you need to run your freelance business
          </h2>
          <p className="text-[18px] text-[var(--color-slate)] leading-relaxed">
            Ditch the scattered tools. Freelancy brings your clients, projects, and invoices into one beautiful space designed specifically for independent professionals.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* Yellow Feature (Large, spans 7) */}
          <motion.div variants={item} className="md:col-span-7 group relative bg-[var(--color-brand-yellow)] p-8 rounded-[var(--radius-xxxl)] flex flex-col min-h-[400px] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-out cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
                <SquaresFour size={28} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[28px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.02em]">Infinite Canvas</h3>
              <p className="text-[var(--color-primary)]/80 text-[18px] leading-relaxed max-w-sm mb-auto">
                Map out projects, draw user flows, and plan your week without boundaries.
              </p>
            </div>
            
            {/* Abstract UI representation */}
            <div className="absolute right-0 bottom-0 w-[65%] h-[65%] bg-white/20 backdrop-blur-sm rounded-tl-[var(--radius-xxl)] border-t border-l border-white/40 shadow-sm p-6 transform translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
               <div className="flex gap-4">
                 <div className="w-24 h-24 bg-white shadow-sm rounded-lg rotate-[-4deg] border border-black/5 p-3 flex flex-col justify-between">
                    <div className="w-8 h-1 bg-black/10 rounded-full"></div>
                    <div className="w-full h-1 bg-black/10 rounded-full"></div>
                 </div>
                 <div className="w-24 h-24 bg-[var(--color-brand-teal)] shadow-sm rounded-lg rotate-[3deg] border border-black/5 p-3 flex flex-col justify-between mt-6">
                    <div className="w-8 h-1 bg-black/20 rounded-full"></div>
                    <div className="w-full h-1 bg-black/20 rounded-full"></div>
                 </div>
               </div>
            </div>
            
            <div className="absolute bottom-8 left-8 flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-10">
              Learn more <ArrowUpRight size={16} weight="bold" className="ml-1" />
            </div>
          </motion.div>

          {/* Coral Feature (Small, spans 5) */}
          <motion.div variants={item} className="md:col-span-5 group relative bg-[var(--color-coral-light)] p-8 rounded-[var(--radius-xxxl)] flex flex-col min-h-[400px] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-out cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
                <Users size={28} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[28px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.02em]">Client Portals</h3>
              <p className="text-[var(--color-primary)]/80 text-[18px] leading-relaxed mb-8">
                Share progress instantly. Clients can comment directly on your boards in real-time.
              </p>
            </div>

            {/* Abstract UI representation */}
            <div className="absolute right-0 bottom-0 w-full flex justify-end px-8 pb-8 pointer-events-none">
              <div className="flex -space-x-3 group-hover:space-x-1 transition-all duration-500">
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-yellow)] border-2 border-[var(--color-coral-light)] shadow-sm"></div>
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-blue)] border-2 border-[var(--color-coral-light)] shadow-sm"></div>
                <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-coral-light)] shadow-sm flex items-center justify-center text-[var(--color-slate)]"><Plus size={16} weight="bold" /></div>
              </div>
            </div>

            <div className="mt-auto flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-10">
              Learn more <ArrowUpRight size={16} weight="bold" className="ml-1" />
            </div>
          </motion.div>

          {/* Teal Feature (Small, spans 5) */}
          <motion.div variants={item} className="md:col-span-5 group relative bg-[var(--color-teal-light)] p-8 rounded-[var(--radius-xxxl)] flex flex-col min-h-[400px] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-out cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
                <Receipt size={28} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[28px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.02em]">Smart Invoicing</h3>
              <p className="text-[var(--color-primary)]/80 text-[18px] leading-relaxed mb-auto">
                Turn project milestones into paid invoices with a single click. Get paid faster.
              </p>
            </div>

            <div className="absolute right-0 bottom-0 w-[80%] h-[50%] bg-white rounded-tl-[var(--radius-xl)] shadow-sm border-t border-l border-black/5 p-4 transform translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
               <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5">
                 <div className="w-16 h-2 bg-black/10 rounded-full"></div>
                 <div className="text-[12px] font-bold text-[var(--color-ink)]">$1,250</div>
               </div>
               <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5">
                 <div className="w-24 h-2 bg-black/10 rounded-full"></div>
                 <div className="text-[12px] font-bold text-[var(--color-ink)]">$800</div>
               </div>
            </div>

            <div className="absolute bottom-8 left-8 flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-10">
              Learn more <ArrowUpRight size={16} weight="bold" className="ml-1" />
            </div>
          </motion.div>

          {/* Rose Feature (Large, spans 7) */}
          <motion.div variants={item} className="md:col-span-7 group relative bg-[var(--color-brand-rose)] p-8 rounded-[var(--radius-xxxl)] flex flex-col min-h-[400px] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-out cursor-pointer overflow-hidden">
            <div className="relative z-10 w-full max-w-sm">
              <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
                <Lightning size={28} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[28px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.02em]">AI Workflows</h3>
              <p className="text-[var(--color-primary)]/80 text-[18px] leading-relaxed mb-auto">
                Let AI draft proposals, generate wireframes, and organize your messy notes.
              </p>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-[50%] bg-gradient-to-l from-white/30 to-transparent flex items-center justify-end pr-8 pointer-events-none group-hover:pr-12 transition-all duration-500">
               <div className="w-full max-w-[200px] space-y-3">
                 <div className="w-full bg-white/60 backdrop-blur-md rounded-[var(--radius-lg)] p-3 shadow-sm border border-white/50 flex gap-3 items-center transform translate-x-4">
                   <div className="w-6 h-6 rounded-full bg-[var(--color-brand-blue)] flex items-center justify-center text-white"><Lightning size={12} weight="fill" /></div>
                   <div className="w-20 h-1.5 bg-black/10 rounded-full"></div>
                 </div>
                 <div className="w-[90%] bg-white/60 backdrop-blur-md rounded-[var(--radius-lg)] p-3 shadow-sm border border-white/50 flex gap-3 items-center">
                   <div className="w-6 h-6 rounded-full bg-[var(--color-brand-yellow)] flex items-center justify-center text-[var(--color-primary)]"><ChartBar size={12} weight="fill" /></div>
                   <div className="w-16 h-1.5 bg-black/10 rounded-full"></div>
                 </div>
               </div>
            </div>

            <div className="absolute bottom-8 left-8 flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-10">
              Learn more <ArrowUpRight size={16} weight="bold" className="ml-1" />
            </div>
          </motion.div>

        </motion.div>

        <div className="mt-16 text-center">
          <Link href="/features" className="inline-flex items-center gap-2 text-[16px] font-medium text-[var(--color-brand-blue)] hover:text-[var(--color-blue-pressed)] transition-colors">
            Explore all features <ArrowUpRight size={18} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
