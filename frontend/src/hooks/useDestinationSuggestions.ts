import { useEffect, useState } from 'react';
import { utilsApi } from '@/lib/api';

export function useDestinationSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timeout = setTimeout(() => {
      utilsApi
        .getDestinationSuggestions(query)
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return { suggestions, isLoading };
}
