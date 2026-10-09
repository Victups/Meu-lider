import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { DateTimeField, RecurrenceField } from '@/components/form';
import { RoleChip, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { eventsService, teamsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import { buildRecurrenceRule, type RecurrenceSelection } from '@/lib/recurrence';
import type { Team } from '@/types';

function nextHour(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export default function NewEventScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  // Typed fields are grouped so the keyboard can carry the user straight
  // through them, instead of being interrupted by a date picker halfway.
  const locationRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(nextHour);
  const [recurrence, setRecurrence] = useState<RecurrenceSelection>({
    kind: 'none',
    weekday: nextHour().getDay(),
    position: 1,
    refWeekday: 0,
    offset: -1,
  });
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
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId],
    );

  const missingTeams = selectedTeams.length === 0;
  const canSubmit = name.trim().length > 0 && !missingTeams && Boolean(currentChurch) && !submitting;

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
        recurrenceRule: buildRecurrenceRule(recurrence),
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
          autoFocus
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => locationRef.current?.focus()}
        />

        <TextInput
          ref={locationRef}
          mode="outlined"
          label="Local"
          placeholder="Templo principal"
          value={location}
          onChangeText={setLocation}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => notesRef.current?.focus()}
        />

        <TextInput
          ref={notesRef}
          mode="outlined"
          label="Observações"
          placeholder="Opcional"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          returnKeyType="done"
        />

        <View style={[styles.divider, { backgroundColor: theme.app.border }]} />

        <DateTimeField
          label="Quando"
          value={eventDate}
          onChange={(next) => {
            setEventDate(next);
            setRecurrence((current) => ({ ...current, weekday: next.getDay() }));
          }}
        />

        <RecurrenceField value={recurrence} onChange={setRecurrence} />

        <View style={styles.teamsBlock}>
          <Text style={[styles.label, { color: theme.app.textMuted }]}>Equipes necessárias</Text>
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
          <HelperText type={missingTeams ? 'error' : 'info'} visible>
            {missingTeams
              ? 'Escolha ao menos uma equipe — a escala é montada só para elas.'
              : 'A escala dessas equipes é montada automaticamente ao salvar.'}
          </HelperText>
        </View>

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

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={error !== null} onDismiss={() => setError(null)} duration={4000}>
        {error ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, lineHeight: 18 },
  teamsBlock: { gap: spacing.sm },
  teams: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  submit: { marginTop: spacing.sm, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
});
