'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

// 참고: 표준 전자상거래 이용약관 템플릿을 바탕으로 작성했습니다.
// 법률 검토를 받은 문서는 아니므로 참고용으로 사용하시고, 필요 시 전문가 검수를 권장합니다.
const ARTICLES = [
  {
    title: '제1조 (목적)',
    body: `본 약관은 농업회사법인 복이네농장(주)(이하 '회사')가 운영하는 '자연의 결' 쇼핑몰(이하 '쇼핑몰')에서 제공하는 인터넷 관련 서비스를 이용함에 있어 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (정의)',
    body: `'쇼핑몰'이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다. '이용자'란 쇼핑몰에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.`,
  },
  {
    title: '제3조 (약관의 명시와 개정)',
    body: `회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 쇼핑몰 초기 화면 또는 연결화면을 통하여 게시합니다. 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 최소 7일 전(이용자에게 불리한 개정은 30일 전)부터 공지합니다.`,
  },
  {
    title: '제4조 (회원가입)',
    body: `이용자는 회사가 정한 절차에 따라 회원가입을 신청하며, 회사는 이용자가 실명이 아니거나 타인의 명의를 이용한 경우 등 관련 법령이 정하는 사유에 해당하지 않는 한 회원으로 등록합니다.`,
  },
  {
    title: '제5조 (계약의 성립)',
    body: `회사는 이용자의 구매 신청에 대하여 신청 내용 확인 후 승낙의 의사표시를 하며, 계약은 회사가 이용자에게 주문 확인 통지를 함으로써 성립합니다. 회사는 재고 부족, 결제 오류 등 정당한 사유가 있는 경우 승낙을 유보하거나 거절할 수 있습니다.`,
  },
  {
    title: '제6조 (결제수단)',
    body: `쇼핑몰에서 이용 가능한 결제수단은 신용카드, 실시간 계좌이체, 무통장입금 등 회사가 정하여 제공하는 방법으로 하며, 카드 정보 등 민감한 결제정보는 결제대행사(PG)가 직접 수집·처리하고 회사는 이를 저장하지 않습니다.`,
  },
  {
    title: '제7조 (배송)',
    body: `회사는 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용 부담자, 수단별 배송기간 등을 명시합니다. 회사는 이용자가 결제한 시점으로부터 영업일 기준 2~3일 이내에 재화를 배송할 수 있도록 조치하며, 천재지변 등 불가항력적 사유가 있는 경우 지체 없이 이용자에게 통지합니다.`,
  },
  {
    title: '제8조 (청약철회 및 환불)',
    body: `이용자는 재화를 공급받은 날로부터 7일 이내에는 청약철회를 할 수 있습니다. 다만 신선식품 등 시간의 경과에 의해 재판매가 곤란할 정도로 가치가 현저히 감소한 경우 등 전자상거래법 제17조에서 정한 사유에 해당하는 경우 청약철회가 제한될 수 있습니다. 자세한 내용은 교환 및 반품 안내 페이지를 따릅니다.`,
  },
  {
    title: '제9조 (개인정보보호)',
    body: `회사는 이용자의 개인정보를 보호하기 위해 관련 법령이 정하는 바를 준수하며, 자세한 사항은 별도로 게시된 개인정보처리방침에 따릅니다.`,
  },
  {
    title: '제10조 (회사의 의무)',
    body: `회사는 관련 법령과 본 약관이 금지하는 행위를 하지 않으며, 지속적·안정적인 서비스 제공을 위해 노력합니다. 회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한 보안 시스템을 갖춥니다.`,
  },
  {
    title: '제11조 (면책조항)',
    body: `회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.`,
  },
  {
    title: '제12조 (분쟁해결 및 준거법)',
    body: `본 약관은 대한민국 법령에 의하여 규정되고 이행되며, 회사와 이용자 간에 발생한 분쟁에 대해서는 민사소송법상의 관할 법원에 제소할 수 있습니다.`,
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="flex-1 bg-hanji-white py-20 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-charcoal mb-12 transition-colors text-sm uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-12 border border-border-light rounded-sm shadow-sm">
          <h1 className="font-serif text-4xl mb-4 text-charcoal border-b border-border-light pb-8">이용약관</h1>
          <p className="text-sm text-muted mb-12">시행일자: 2026년 8월 1일</p>

          <div className="space-y-10 text-sm text-charcoal/80 leading-relaxed">
            {ARTICLES.map((a) => (
              <section key={a.title}>
                <div className="flex items-center gap-2 mb-3 text-deep-sage">
                  <FileText className="w-4 h-4" />
                  <h2 className="font-serif text-lg font-bold text-charcoal">{a.title}</h2>
                </div>
                <p className="font-normal">{a.body}</p>
              </section>
            ))}

            <section className="bg-hanji-white p-6 border border-border-light rounded-sm">
              <h2 className="font-serif text-lg font-bold mb-4">문의처</h2>
              <div className="space-y-1 font-normal">
                <p>상호: 농업회사법인 복이네농장(주)</p>
                <p>이메일: {CONFIG.CONTACT_EMAIL}</p>
                {CONFIG.CONTACT_PHONE !== '010-0000-0000' && <p>전화: {CONFIG.CONTACT_PHONE}</p>}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
