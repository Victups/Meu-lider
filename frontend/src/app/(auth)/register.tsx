import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const emailRef = useRef<RNTextInput>(null);
  const churchRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [churchId, setChurchId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit =
    name.trim() !== '' &&
    email.trim() !== '' &&
    churchId.trim() !== '' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    !mismatch &&
    !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        churchId: churchId.trim(),
        password,
      });
      router.replace('/');
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.app.text }]}>Criar conta</Text>
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
            Peça o código da sua igreja para a liderança
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Nome completo"
            value={name}
            onChangeText={setName}
            autoFocus
            autoComplete="name"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
            left={<TextInput.Icon icon="account-outline" />}
          />

          <TextInput
            ref={emailRef}
            mode="outlined"
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => churchRef.current?.focus()}
            left={<TextInput.Icon icon="email-outline" />}
          />

          <TextInput
            ref={churchRef}
            mode="outlined"
            label="Código da igreja"
            value={churchId}
            onChangeText={setChurchId}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            left={<TextInput.Icon icon="church" />}
          />
          <HelperText type="info" visible>
            Código no formato 0000aaaa-00aa-00aa-00aa-0000aaaa0000
          </HelperText>

          <TextInput
            ref={passwordRef}
            mode="outlined"
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmRef.current?.focus()}
            left={<TextInput.Icon icon="lock-outline" />}
          />
          <HelperText type={passwordTooShort ? 'error' : 'info'} visible>
            Mínimo de {MIN_PASSWORD_LENGTH} caracteres
          </HelperText>

          <TextInput
            ref={confirmRef}
            mode="outlined"
            label="Confirmar senha"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            error={mismatch}
            returnKeyType="go"
            onSubmitEditing={() => canSubmit && handleSubmit()}
            left={<TextInput.Icon icon="lock-check-outline" />}
          />
          <HelperText type="error" visible={mismatch}>
            As senhas não conferem
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            Criar conta
          </Button>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.app.textMuted }]}>Já tem conta?</Text>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: theme.colors.primary }]}>
              Entrar
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Snackbar visible={error !== null} onDismiss={() => setError(null)} duration={4000}>
        {error ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xxl, paddingBottom: spacing.xl, gap: spacing.xs },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  form: { gap: spacing.xs },
  submit: { marginTop: spacing.md, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  footerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  footerLink: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm },
});
