import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { authService } from '@/services';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

const MIN_PASSWORD_LENGTH = 8;

/** Two steps on one screen: ask for the code by e-mail, then choose the new password. */
export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const address = email.trim().toLowerCase();
  const mismatch = confirmation.length > 0 && confirmation !== password;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setMessage(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await authService.forgotPassword(address);
      setStep('code');
      setMessage('Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos.');
    });

  const reset = () =>
    run(async () => {
      await authService.resetPassword({ email: address, code: code.trim(), newPassword: password });
      router.replace('/(auth)/login');
    });

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.app.text }]}>Recuperar senha</Text>
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
            {step === 'email'
              ? 'Informe o e-mail da sua conta e enviaremos um código.'
              : 'Digite o código que chegou no seu e-mail e escolha a nova senha.'}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={step === 'email'}
            left={<TextInput.Icon icon="email-outline" />}
          />

          {step === 'code' ? (
            <>
              <TextInput
                mode="outlined"
                label="Código de 6 dígitos"
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                left={<TextInput.Icon icon="shield-key-outline" />}
              />
              <TextInput
                mode="outlined"
                label="Nova senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                left={<TextInput.Icon icon="lock-outline" />}
              />
              <HelperText type={password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? 'error' : 'info'} visible>
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres
              </HelperText>
              <TextInput
                mode="outlined"
                label="Confirmar nova senha"
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                error={mismatch}
                left={<TextInput.Icon icon="lock-check-outline" />}
              />
              <HelperText type="error" visible={mismatch}>
                As senhas não conferem
              </HelperText>
            </>
          ) : null}

          {step === 'email' ? (
            <Button
              mode="contained"
              onPress={sendCode}
              loading={busy}
              disabled={busy || !/\S+@\S+\.\S+/.test(address)}
              style={styles.submit}
            >
              Enviar código
            </Button>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={reset}
                loading={busy}
                disabled={busy || code.length !== 6 || password.length < MIN_PASSWORD_LENGTH || password !== confirmation}
                style={styles.submit}
              >
                Redefinir senha
              </Button>
              <Button mode="text" onPress={sendCode} disabled={busy}>
                Reenviar código
              </Button>
            </>
          )}

          <View style={styles.footer}>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: theme.colors.primary }]}>
              Voltar para o login
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={5000}>
        {message ?? ''}
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
  footer: { alignItems: 'center', marginTop: spacing.xl },
  footerLink: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm },
});
