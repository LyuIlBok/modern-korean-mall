export function formatPrice(price: number): string {
  return `₩${price.toLocaleString()}`;
}

export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
