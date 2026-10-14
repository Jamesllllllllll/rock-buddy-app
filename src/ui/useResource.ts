import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from './api';

// Keep cached data visible during refreshes, but never borrow data from a different key.
export function useResource<T>(key: string, read: () => Promise<T>, options?: { cache?: boolean }) {
    const client = useQueryClient();
    const query = useQuery({
        queryKey: ['resource', key],
        queryFn: read,
        ...(options?.cache === false ? { staleTime: 0, gcTime: 0 } : {}),
    });

    // Repeated refresh clicks share an existing request instead of starting competing reads.
    const reload = useCallback(() => {
        void client.refetchQueries({ queryKey: ['resource', key], exact: true }, { cancelRefetch: false });
    }, [client, key]);

    // A successful edit replaces the cache after cancelling any older in-flight read.
    const setData = useCallback(async (data: T) => {
        await client.cancelQueries({ queryKey: ['resource', key], exact: true });
        client.setQueryData(['resource', key], data);
    }, [client, key]);

    return {
        data: query.data,
        error: query.error ? errorMessage(query.error) : undefined,
        loading: query.isPending,
        refreshing: query.isFetching && query.data !== undefined,
        hasData: query.data !== undefined,
        updatedAt: query.dataUpdatedAt,
        reload,
        setData,
    };
}
