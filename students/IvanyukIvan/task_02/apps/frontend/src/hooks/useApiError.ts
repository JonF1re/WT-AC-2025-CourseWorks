import { useState } from 'react';

export function useApiError() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return { error, setError, loading, setLoading } as const;
}
