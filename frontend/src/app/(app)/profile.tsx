import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, Divider, HelperText, List, Snackbar, TextInput } from 'react-native-paper';
import { Avatar, Screen, Sheet } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import { USER_ROLE_LABEL, canManageSomeTeam, canSeeAllRosters } from '@/types';

const MIN_PASSWORD_LENGTH = 8;

type Panel = 'signOut' | 'profile' | 'password' | null;

export default function ProfileScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const { user, signOut, setUser } = useAuthStore();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const isLeader = user ? canManageSomeTeam(user.role) : false;
  const canSeeReports = user ? isLeader || canSeeAllRosters(user.role) : false;
  const go = (path: string) => router.push(path as Href);

  const run = async (action: () => Promise<void>, done?: string) => {
    setBusy(true);
    try {
      await action();
      setPanel(null);
      if (done) setToast(done);
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openProfile = () => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setPanel('profile');
  };

  const openPassword = () => {
    setCurrent('');
    setNext('');
    setConfirmation('');
    setPanel('password');
  };

  const saveProfile = () =>
    run(async () => setUser(await authService.updateProfile({ name: name.trim(), phone: phone.trim() })), 'Perfil atualizado');

  const savePassword = () =>
    run(
      () => authService.changePassword({ currentPassword: current, newPassword: next }),
      'Senha alterada. Os outros aparelhos precisarão entrar de novo.',
    );

  const handleSignOut = () =>
    run(async () => {
      await signOut();
      router.replace('/(auth)/login');
    });

  const passwordTooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== next;

  const item = (title: string, description: string, icon: string, onPress: () => void) => (
    <List.Item
      title={title}
      description={description}
      left={(props) => <List.Icon {...props} icon={icon} />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={onPress}
    />
  );

  return (
    <Screen scroll>
      <View style={[styles.identity, { backgroundColor: theme.app.surface, borderColor: theme.app.border }]}>
        <Avatar name={user?.name ?? '?'} size={64} />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: theme.app.text }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: theme.app.textMuted }]}>{user?.email}</Text>
          {user ? (
            <Text style={[styles.role, { color: theme.colors.primary }]}>{USER_ROLE_LABEL[user.role]}</Text>
          ) : null}
        </View>
      </View>

      <List.Section>
        <List.Subheader>Conta</List.Subheader>
        {item('Editar perfil', 'Nome e telefone', 'account-edit-outline', openProfile)}
        {item('Alterar senha', 'Troque a senha de acesso', 'lock-outline', openPassword)}
        {item('Minha disponibilidade', 'Avise quando não puder servir', 'calendar-remove-outline', () => go('/availability'))}
        {item('Trocas com colegas', 'Pedidos enviados e recebidos', 'swap-horizontal', () => go('/swaps'))}
      </List.Section>

      {isLeader || canSeeReports || currentChurch ? (
        <>
          <Divider />
          <List.Section>
            <List.Subheader>Igreja</List.Subheader>
            {currentChurch
              ? item(
                  currentChurch.name,
                  currentChurch.description ?? 'Ver e editar os dados da igreja',
                  'church',
                  () => go('/church-settings'),
                )
              : null}
            {isLeader ? item('Convidar pessoas', 'Gere um código curto para mandar no WhatsApp', 'email-plus-outline', () => go('/invitations')) : null}
            {canSeeReports ? item('Relatórios', 'Quem serviu, faltas e escalas a vir', 'chart-bar', () => go('/reports')) : null}
          </List.Section>
        </>
      ) : null}

      <Button
        mode="outlined"
        textColor={theme.colors.error}
        onPress={() => setPanel('signOut')}
        style={styles.signOut}
        icon="logout"
      >
        Sair da conta
      </Button>

      <Sheet
        visible={panel === 'signOut'}
        onDismiss={() => setPanel(null)}
        title="Sair da conta?"
        subtitle="Você precisará entrar novamente para ver suas escalas."
        footer={
          <>
            <Button mode="outlined" onPress={() => setPanel(null)} style={styles.sheetAction}>
              Cancelar
            </Button>
            <Button mode="contained" onPress={handleSignOut} loading={busy} buttonColor={theme.colors.error} style={styles.sheetAction}>
              Sair
            </Button>
          </>
        }
      >
        <View />
      </Sheet>

      <Sheet
        visible={panel === 'profile'}
        onDismiss={() => setPanel(null)}
        title="Editar perfil"
        footer={
          <>
            <Button mode="outlined" onPress={() => setPanel(null)} style={styles.sheetAction}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={saveProfile}
              loading={busy}
              disabled={busy || name.trim().length < 3}
              style={styles.sheetAction}
            >
              Salvar
            </Button>
          </>
        }
      >
        <TextInput mode="outlined" label="Nome completo" value={name} onChangeText={setName} autoComplete="name" />
        <TextInput mode="outlined" label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
      </Sheet>

      <Sheet
        visible={panel === 'password'}
        onDismiss={() => setPanel(null)}
        title="Alterar senha"
        footer={
          <>
            <Button mode="outlined" onPress={() => setPanel(null)} style={styles.sheetAction}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={savePassword}
              loading={busy}
              disabled={busy || !current || next.length < MIN_PASSWORD_LENGTH || mismatch || confirmation !== next}
              style={styles.sheetAction}
            >
              Alterar
            </Button>
          </>
        }
      >
        <TextInput mode="outlined" label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <TextInput mode="outlined" label="Nova senha" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
        <HelperText type={passwordTooShort ? 'error' : 'info'} visible>
          Mínimo de {MIN_PASSWORD_LENGTH} caracteres
        </HelperText>
        <TextInput mode="outlined" label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry error={mismatch} />
        <HelperText type="error" visible={mismatch}>
          As senhas não conferem
        </HelperText>
      </Sheet>

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={3500}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  identityText: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.lg },
  email: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  role: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, marginTop: 2 },
  signOut: { marginTop: spacing.xl, marginBottom: spacing.xxl, borderRadius: radius.md },
  sheetAction: { flex: 1, borderRadius: radius.md },
});
