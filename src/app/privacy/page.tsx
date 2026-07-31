'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Database, Users, Clock, Lock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

// 참고: 실제 서비스 운영 형태가 바뀌면(예: SNS 로그인 연동, 마케팅 문자 발송 등)
// 이 문서도 함께 업데이트해야 합니다. 법률 검토를 받은 문서는 아니므로
// 참고용 템플릿으로 사용하시고, 필요 시 전문가 검수를 권장합니다.
export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 bg-hanji-white py-20 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-charcoal mb-12 transition-colors text-xs uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-12 border border-border-light rounded-sm shadow-sm">
          <h1 className="font-serif text-4xl mb-4 text-charcoal border-b border-border-light pb-8">개인정보처리방침</h1>
          <p className="text-xs text-muted mb-12">시행일자: 2026년 8월 1일</p>

          <div className="space-y-12 text-sm text-charcoal/80 leading-relaxed">
            <section>
              <p className="font-light">
                농업회사법인 복이네농장(주)(이하 &apos;회사&apos;)이 운영하는 &apos;자연의 결&apos;(이하 &apos;쇼핑몰&apos;)은 「개인정보보호법」 등 관련 법령을 준수하며,
                이용자의 개인정보를 안전하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <Database className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">1. 수집하는 개인정보 항목 및 수집 방법</h2>
              </div>
              <ul className="list-disc pl-5 space-y-3 font-light">
                <li>회원가입 시: 이메일, 비밀번호, 이름(닉네임), 휴대전화번호</li>
                <li>주문/결제 시: 주문자명, 배송지 주소, 연락처, 결제정보(카드사·거래승인번호 등, 카드번호 등 민감정보는 결제대행사(PG)가 직접 처리하며 회사는 저장하지 않습니다)</li>
                <li>고객문의/1:1 채팅 이용 시: 문의 내용, 이메일 또는 연락처</li>
                <li>서비스 이용 과정에서 자동 수집: 접속 IP, 쿠키, 접속 로그, 서비스 이용 기록</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <Users className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">2. 개인정보의 수집 및 이용 목적</h2>
              </div>
              <ul className="list-disc pl-5 space-y-3 font-light">
                <li>회원 관리: 본인 확인, 회원제 서비스 이용, 부정 이용 방지</li>
                <li>재화 또는 서비스 제공: 상품 배송, 결제, 계약서·청구서 발송, 본인인증</li>
                <li>고객 상담 및 불만 처리: 문의 응대, 공지사항 전달, 분쟁 조정을 위한 기록 보존</li>
                <li>마케팅 및 광고 활용(별도 동의 시): 신상품·이벤트 정보 안내 (선택 동의 항목이며, 동의하지 않아도 서비스 이용에 제한이 없습니다)</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <Clock className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">3. 개인정보의 보유 및 이용 기간</h2>
              </div>
              <p className="font-light mb-3">
                회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 관계 법령에 따라 보존할 필요가 있는 경우 아래와 같이 일정 기간 보관합니다.
              </p>
              <ul className="list-disc pl-5 space-y-3 font-light">
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                <li>표시·광고에 관한 기록: 6개월 (전자상거래법)</li>
                <li>접속에 관한 기록(로그인 기록 등): 3개월 (통신비밀보호법)</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">4. 개인정보의 제3자 제공 및 처리 위탁</h2>
              </div>
              <p className="font-light mb-3">
                회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않으며, 다음의 경우에만 예외적으로 제공하거나 처리를 위탁합니다.
              </p>
              <ul className="list-disc pl-5 space-y-3 font-light">
                <li>결제 처리를 위한 결제대행사(PG사)에게 결제에 필요한 최소한의 정보 제공</li>
                <li>상품 배송을 위한 택배사에게 수령인명, 주소, 연락처 제공</li>
                <li>이용자가 사전에 동의한 경우, 또는 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <UserCheck className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">5. 이용자의 권리와 행사 방법</h2>
              </div>
              <p className="font-light">
                이용자는 언제든지 마이페이지 또는 고객센터를 통해 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보 수집·이용에 대한 동의를 철회할 수 있습니다.
                개인정보 열람, 정정·삭제, 처리정지를 요청하실 경우 아래 연락처로 문의해 주시면 지체 없이 조치하겠습니다.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <Lock className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">6. 개인정보의 안전성 확보 조치</h2>
              </div>
              <ul className="list-disc pl-5 space-y-3 font-light">
                <li>비밀번호 등 주요 정보의 암호화 저장 및 전송</li>
                <li>해킹 등에 대비한 접근 통제 및 접근 권한 최소화</li>
                <li>개인정보 처리 시스템에 대한 접속 기록 보관</li>
              </ul>
            </section>

            <section className="bg-hanji-white p-6 border border-border-light rounded-sm">
              <h2 className="font-serif text-lg font-bold mb-4">개인정보 보호책임자</h2>
              <div className="space-y-1 font-light">
                <p>성명: {CONFIG.SITE_NAME} 대표 유일복</p>
                <p>이메일: {CONFIG.CONTACT_EMAIL}</p>
                {CONFIG.CONTACT_PHONE !== '010-0000-0000' && <p>전화: {CONFIG.CONTACT_PHONE}</p>}
              </div>
              <p className="text-xs text-muted mt-4">
                본 방침은 관계 법령 및 회사 내부 방침에 따라 변경될 수 있으며, 변경 시 웹사이트 공지사항을 통해 고지합니다.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
