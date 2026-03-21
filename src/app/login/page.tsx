'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Leaf, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 가상 로그인 로직 (아이디/비번 상관없이 통과)
    if (email && password) {
      alert('관리자로 로그인되었습니다.');
      router.push('/admin');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24 bg-hanji-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-deep-sage">
            <Leaf className="w-10 h-10 mx-auto" />
          </Link>
          <h1 className="font-serif text-3xl mb-3 text-charcoal">자연의 결</h1>
          <p className="text-muted text-sm tracking-widest uppercase">Member Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs text-muted ml-1 uppercase tracking-tighter">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해 주세요"
              className="w-full bg-white border border-border-light px-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted ml-1 uppercase tracking-tighter">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              className="w-full bg-white border border-border-light px-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 flex items-center justify-center gap-2 group font-medium"
          >
            로그인 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 flex items-center justify-between text-xs text-muted border-t border-border-light pt-8">
          <div className="flex gap-4">
            <button className="hover:text-charcoal transition-colors">아이디 찾기</button>
            <button className="hover:text-charcoal transition-colors">비밀번호 찾기</button>
          </div>
          <Link href="#" className="font-medium text-charcoal hover:text-terracotta transition-colors">회원가입</Link>
        </div>
      </motion.div>
    </div>
  );
}