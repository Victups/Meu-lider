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
import { Ionicons } from '@expo/vector-icons';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const passwordRef = useRef<RNTextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = email.length === 0 || /\S+@\S+\.\S+/.test(email);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
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
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="calendar-clear" size={28} color={theme.colors.onPrimary} />
          </View>
          <Text style={[styles.title, { color: theme.app.text }]}>Meu Líder</Text>
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
            Organize as escalas da sua igreja em um só lugar
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <HelperText type="error" visible={!emailLooksValid}>
            Digite um e-mail válido
          </HelperText>

          <TextInput
            ref={passwordRef}
            mode="outlined"
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => canSubmit && handleSubmit()}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />

          <Link
            href={'/(auth)/forgot-password' as never}
            style={[styles.forgot, { color: theme.colors.primary }]}
          >
            Esqueci minha senha
          </Link>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            Entrar
          </Button>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.app.textMuted }]}>
              Ainda não tem conta?
            </Text>
            <Link href="/(auth)/register" style={[styles.footerLink, { color: theme.colors.primary }]}>
              Criar conta
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
  hero: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xl, gap: spacing.sm },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  form: { gap: spacing.xs },
  forgot: { alignSelf: 'flex-end', fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, marginTop: spacing.xs },
  submit: { marginTop: spacing.lg, borderRadius: radius.md },
  submitContent: { paddingVertical: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  footerLink: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm },
});
