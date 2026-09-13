import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Monerva`;
  }, [title]);
}

export default usePageTitle;
