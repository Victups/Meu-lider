import { useCallback, useEffect, useState } from 'react';
import { membersService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import type { Member } from '@/types';

/**
 * Resolves the Member row behind the signed-in User. The API has no
 * "/members/me" route, so it is matched from the church roster by user id.
 */
export function useCurrentMember() {
  const user = useAuthStore((s) => s.user);
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !currentChurch) {
      setLoading(false);
      return;
    }

    try {
      const roster = await membersService.list(currentChurch.id);
      setMember(roster.find((entry) => entry.userId === user.id) ?? null);
    } finally {
      setLoading(false);
    }
  }, [user, currentChurch]);

  useEffect(() => {
    load();
  }, [load]);

  return { member, loading, reload: load };
}
