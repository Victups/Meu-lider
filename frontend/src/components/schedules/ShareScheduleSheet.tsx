import { useMemo, useState } from 'react';
import { Share } from 'react-native';
import { Button } from 'react-native-paper';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectField } from '../form';
import { Sheet } from '../ui';
import { toUserMessage } from '../../lib/errors';
import { schedulesService } from '../../services';
import { radius } from '../../theme';
import type { ID, Team } from '../../types';

interface ShareScheduleSheetProps {
  visible: boolean;
  onDismiss: () => void;
  churchId: ID;
  /** Teams the person may share; one team hides the picker. */
  teams: Team[];
  onError: (message: string) => void;
}

const ALL = 'all';

/** The month's roster as WhatsApp text, for groups whose members are not on the app yet. */
export function ShareScheduleSheet({ visible, onDismiss, churchId, teams, onError }: ShareScheduleSheetProps) {
  const months = useMemo(() => {
    const now = new Date();
    return [0, 1, -1].map((offset) => {
      const date = addMonths(now, offset);
      return { value: format(date, 'yyyy-MM'), label: format(date, "MMMM 'de' yyyy", { locale: ptBR }) };
    });
  }, []);

  const [month, setMonth] = useState(months[0].value);
  const [teamId, setTeamId] = useState<string>(teams.length === 1 ? teams[0].id : ALL);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    try {
      const result = await schedulesService.shareText(churchId, month, teamId === ALL ? undefined : teamId);
      await Share.share({ message: result.text });
      onDismiss();
    } catch (err) {
      onError(toUserMessage(err));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      title="Compartilhar escala"
      subtitle="Gera o texto do mês, pronto para colar no WhatsApp."
      footer={
        <>
          <Button mode="outlined" onPress={onDismiss} style={{ flex: 1, borderRadius: radius.md }}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            icon="share-variant"
            onPress={share}
            loading={sharing}
            disabled={sharing}
            style={{ flex: 1, borderRadius: radius.md }}
          >
            Compartilhar
          </Button>
        </>
      }
    >
      <SelectField label="Mês" value={month} onSelect={setMonth} options={months} />
      {teams.length > 1 ? (
        <SelectField
          label="Equipe"
          value={teamId}
          onSelect={setTeamId}
          options={[{ value: ALL, label: 'Todas as equipes' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
        />
      ) : null}
    </Sheet>
  );
}

