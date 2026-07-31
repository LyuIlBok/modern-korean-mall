export type Category = '농산물' | '농자재';
export type Language = 'ko' | 'en';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  shipping_fee: number;
  images?: string[];
  detail_content_images?: string[];
  stock: number;
  is_sold_out: boolean;
  is_active?: boolean;
  discount_rate?: number;
  reward_points?: number;
  origin?: string;
  producer?: string;
  // 상품 목록(ProductCard)에서 "옵션 선택 필수" 상품인지 판단하기 위한 값.
  // 목록 조회 시 product_options(id)를 같이 select해서 길이로 채워줍니다.
  has_options?: boolean;
  specs?: {
    origin?: string;
    producer?: string;
    [key: string]: any;
  };
}

export interface ProductOption {
  id: string;
  product_id: string;
  option_name: string;
  additional_price: number;
  stock: number;
  is_active: boolean;
  created_at?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string;
  shipping_fee: number;
  quantity: number;
  optionName?: string;
  optionPrice?: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  guest_email: string | null;
  guest_phone: string | null;
  address: string;
  total_price: number;
  status: '결제대기' | '결제완료' | '상품준비중' | '배송중' | '배송완료' | '주문취소';
  payment_method: 'card' | 'transfer';
  memo?: string;
  pg_tid?: string;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name: string;
  product_price: number;
  option_name: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_id?: string;
  user_name: string;
  rating: number;
  content: string;
  image_url?: string | null;
  created_at: string;
}

export interface QnA {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  question_type: string;
  content: string;
  is_secret: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface InquiryProduct {
  id: string;
  name: string;
  imageUrl: string;
  orderId?: string;
  price?: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
