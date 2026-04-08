import { useState, useEffect } from 'react';

/**
 * [Hook: useHasMounted]
 * - 컴포넌트가 클라이언트 사이드에서 마운트되었는지 여부를 반환합니다.
 * - 하이드레이션 오류 방지를 위해 사용됩니다.
 */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // 비동기적으로 실행되도록 처리하여 동기적 setState 경고를 회피합니다.
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return hasMounted;
}
