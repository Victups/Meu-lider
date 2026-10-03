import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { teamsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

const TEAM_COLORS = [
  '#4D5AC4',
  '#2E9E6B',
  '#C27F1E',
  '#D1485B',
  '#7A4DC4',
  '#2E8B9E',
  '#C4584D',
  '#5D594F',
];

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewTeamScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = toSlug(name);
  const canSubmit = slug.length > 0 && Boolean(currentChurch) && !submitting;

  const handleSubmit = async () => {
    if (!currentChurch) return;
    setSubmitting(true);
    setError(null);
    try {
      await teamsService.create(currentChurch.id, {
        churchId: currentChurch.id,
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
        color,
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
          label="Nome da equipe"
          placeholder="Louvor"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          mode="outlined"
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        <View style={styles.colorBlock}>
          <Text style={[styles.label, { color: theme.app.textMuted }]}>Cor da equipe</Text>
          <View style={styles.swatches}>
            {TEAM_COLORS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setColor(option)}
                style={[styles.swatch, { backgroundColor: option }]}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${option}`}
              >
                {color === option ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          style={styles.submit}
          contentStyle={styles.submitContent}
        >
          Criar equipe
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
  colorBlock: { gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: { marginTop: spacing.md, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
});
