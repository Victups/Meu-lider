import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { ActivityIndicator, Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { churchesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Church, UpdateChurchInput } from '@/types';

const MIN_NAME_LENGTH = 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ChurchForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const EMPTY_FORM: ChurchForm = {
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
};

function toForm(church: Church): ChurchForm {
  return {
    name: church.name,
    description: church.description ?? '',
    address: church.address ?? '',
    phone: church.phone ?? '',
    email: church.email ?? '',
    website: church.website ?? '',
  };
}

/** `undefined` means "unchanged, do not send"; `null` means "clear it". */
function changedValue(next: string, loaded: string): string | null | undefined {
  const value = next.trim();
  if (value === loaded.trim()) return undefined;
  return value.length > 0 ? value : null;
}

function buildPayload(form: ChurchForm, loaded: ChurchForm): UpdateChurchInput {
  const payload: UpdateChurchInput = {};
  const name = changedValue(form.name, loaded.name);
  if (name) payload.name = name;

  const fields = ['description', 'address', 'phone', 'email', 'website'] as const;
  for (const field of fields) {
    const value = changedValue(form[field], loaded[field]);
    if (value !== undefined) payload[field] = value;
  }

  return payload;
}

export default function ChurchSettingsScreen() {
  const theme = useAppTheme();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const replaceChurch = useChurchStore((s) => s.replaceChurch);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const canEdit = isAdmin();
  const churchId = currentChurch?.id ?? null;

  const addressRef = useRef<RNTextInput>(null);
  const phoneRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const websiteRef = useRef<RNTextInput>(null);

  const [church, setChurch] = useState<Church | null>(null);
  const [loaded, setLoaded] = useState<ChurchForm>(EMPTY_FORM);
  const [form, setForm] = useState<ChurchForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const fresh = await churchesService.getById(churchId);
      setChurch(fresh);
      setLoaded(toForm(fresh));
      setForm(toForm(fresh));
    } catch (err) {
      setLoadError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (field: keyof ChurchForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const payload = useMemo(() => buildPayload(form, loaded), [form, loaded]);
  const isDirty = Object.keys(payload).length > 0;

  const nameTooShort = form.name.trim().length < MIN_NAME_LENGTH;
  const emailInvalid = form.email.trim().length > 0 && !EMAIL_PATTERN.test(form.email.trim());
  const canSave = canEdit && isDirty && !nameTooShort && !emailInvalid && !saving;

  const handleSave = async () => {
    if (!churchId || !canSave) return;
    setSaving(true);
    try {
      const saved = await churchesService.update(churchId, payload);
      setChurch(saved);
      setLoaded(toForm(saved));
      setForm(toForm(saved));
      replaceChurch(saved);
      setToast('Dados da igreja salvos');
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!churchId) {
    return (
      <Screen>
        <EmptyState
          icon="business-outline"
          title="Nenhuma igreja selecionada"
          description="Escolha uma igreja na tela inicial para ver os dados dela."
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar"
          description={loadError}
          actionLabel="Tentar de novo"
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.app.text }]}>Dados da igreja</Text>
          {church ? (
            <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
              Identificador: {church.slug}
            </Text>
          ) : null}
        </View>

        {canEdit ? (
          <View style={styles.form}>
            <View>
              <TextInput
                mode="outlined"
                label="Nome"
                value={form.name}
                onChangeText={setField('name')}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => addressRef.current?.focus()}
                error={nameTooShort}
              />
              <HelperText type="error" visible={nameTooShort}>
                Informe ao menos {MIN_NAME_LENGTH} caracteres.
              </HelperText>
            </View>

            {/* Out of the return-key chain on purpose: here Enter breaks the line. */}
            <TextInput
              mode="outlined"
              label="Descrição"
              placeholder="Uma frase sobre a igreja"
              value={form.description}
              onChangeText={setField('description')}
              multiline
              numberOfLines={3}
            />

            <TextInput
              ref={addressRef}
              mode="outlined"
              label="Endereço"
              placeholder="Rua, número, bairro, cidade"
              value={form.address}
              onChangeText={setField('address')}
              autoCapitalize="sentences"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => phoneRef.current?.focus()}
            />

            <TextInput
              ref={phoneRef}
              mode="outlined"
              label="Telefone"
              placeholder="(11) 90000-0000"
              value={form.phone}
              onChangeText={setField('phone')}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <View>
              <TextInput
                ref={emailRef}
                mode="outlined"
                label="E-mail"
                placeholder="contato@igreja.com.br"
                value={form.email}
                onChangeText={setField('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => websiteRef.current?.focus()}
                error={emailInvalid}
              />
              <HelperText type="error" visible={emailInvalid}>
                E-mail inválido.
              </HelperText>
            </View>

            <TextInput
              ref={websiteRef}
              mode="outlined"
              label="Site"
              placeholder="https://igreja.com.br"
              value={form.website}
              onChangeText={setField('website')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Button
              mode="contained"
              onPress={handleSave}
              disabled={!canSave}
              loading={saving}
              style={styles.save}
              contentStyle={styles.saveContent}
            >
              Salvar alterações
            </Button>

            {!isDirty && !saving ? (
              <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
                Nada para salvar por enquanto.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.form}>
            <View
              style={[
                styles.notice,
                { backgroundColor: theme.app.surfaceSunken, borderColor: theme.app.border },
              ]}
            >
              <Text style={[styles.noticeText, { color: theme.app.textMuted }]}>
                Só a administração da igreja pode alterar estes dados.
              </Text>
            </View>

            <ReadOnlyField label="Nome" value={form.name} />
            <ReadOnlyField label="Descrição" value={form.description} />
            <ReadOnlyField label="Endereço" value={form.address} />
            <ReadOnlyField label="Telefone" value={form.phone} />
            <ReadOnlyField label="E-mail" value={form.email} />
            <ReadOnlyField label="Site" value={form.website} />
          </View>
        )}
      </ScrollView>

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.readOnly}>
      <Text style={[styles.readOnlyLabel, { color: theme.app.textMuted }]}>{label}</Text>
      <Text
        style={[styles.readOnlyValue, { color: value ? theme.app.text : theme.app.textSubtle }]}
      >
        {value || 'Não informado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  form: { gap: spacing.md },
  save: { marginTop: spacing.md, borderRadius: radius.md },
  saveContent: { paddingVertical: spacing.xs },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, textAlign: 'center' },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  readOnly: { gap: 2 },
  readOnlyLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
  readOnlyValue: { fontFamily: fontFamily.body, fontSize: fontSize.md, lineHeight: 22 },
});
