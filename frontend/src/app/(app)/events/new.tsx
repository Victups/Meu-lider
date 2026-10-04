import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { DateTimeField } from '@/components/form';
import { RoleChip, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { eventsService, teamsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Team } from '@/types';

function nextHour(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export default function NewEventScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(nextHour);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentChurch) return;
    teamsService
      .list(currentChurch.id)
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [currentChurch]);

  const toggleTeam = (teamId: string) =>
    setSelectedTeams((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );

  // Without a team the scheduler has nobody to staff, so block the save.
  const canSubmit =
    name.trim().length > 0 && selectedTeams.length > 0 && Boolean(currentChurch) && !submitting;

  const handleSubmit = async () => {
    if (!currentChurch) return;
    setSubmitting(true);
    setError(null);
    try {
      await eventsService.create(currentChurch.id, {
        churchId: currentChurch.id,
        name: name.trim(),
        eventDate: eventDate.toISOString(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        teamIds: selectedTeams,
      });
      router.back();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="Nome do evento"
          placeholder="Culto de domingo"
          value={name}
          onChangeText={setName}
        />

        <DateTimeField label="Data e hora" value={eventDate} onChange={setEventDate} />

        <TextInput
          mode="outlined"
          label="Local"
          placeholder="Templo principal"
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.teamsBlock}>
          <Text style={[styles.label, { color: theme.app.textMuted }]}>
            Equipes necessárias
          </Text>
          <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
            A escala é montada só para as equipes marcadas.
          </Text>
          <View style={styles.teams}>
            {teams.length === 0 ? (
              <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
                Nenhuma equipe cadastrada ainda.
              </Text>
            ) : (
              teams.map((team) => (
                <RoleChip
                  key={team.id}
                  label={team.name}
                  selected={selectedTeams.includes(team.id)}
                  onPress={() => toggleTeam(team.id)}
                />
              ))
            )}
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="Observações"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          style={styles.submit}
          contentStyle={styles.submitContent}
        >
          Criar evento
        </Button>
      </View>

      <Snackbar visible={error !== null} onDismiss={() => setError(null)} duration={4000}>
        {error ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingTop: spacing.lg },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, lineHeight: 18 },
  teamsBlock: { gap: spacing.xs },
  teams: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  submit: { marginTop: spacing.md, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
});
