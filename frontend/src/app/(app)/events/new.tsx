import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { DateTimeField } from '@/components/form';
import { Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { eventsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { radius, spacing } from '@/theme';

function nextHour(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export default function NewEventScreen() {
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(nextHour);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && Boolean(currentChurch) && !submitting;

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
  submit: { marginTop: spacing.md, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
});
