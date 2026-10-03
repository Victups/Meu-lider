import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Divider, List } from 'react-native-paper';
import { Avatar, Screen, Sheet } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Administrador geral',
  CHURCH_ADMIN: 'Administrador da igreja',
  LEADER: 'Líder de equipe',
  MEMBER: 'Membro',
};

export default function ProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } finally {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  };

  return (
    <Screen scroll>
      <View style={[styles.identity, { backgroundColor: theme.app.surface, borderColor: theme.app.border }]}>
        <Avatar name={user?.name ?? '?'} size={64} />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: theme.app.text }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: theme.app.textMuted }]}>{user?.email}</Text>
          {user ? (
            <Text style={[styles.role, { color: theme.colors.primary }]}>
              {ROLE_LABEL[user.role]}
            </Text>
          ) : null}
        </View>
      </View>

      {currentChurch ? (
        <List.Section>
          <List.Subheader>Igreja</List.Subheader>
          <List.Item
            title={currentChurch.name}
            description={currentChurch.description ?? undefined}
            left={(props) => <List.Icon {...props} icon="church" />}
          />
        </List.Section>
      ) : null}

      <Divider />

      <List.Section>
        <List.Subheader>Conta</List.Subheader>
        <List.Item
          title="Minha disponibilidade"
          description="Avise quando não puder servir"
          left={(props) => <List.Icon {...props} icon="calendar-remove-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/availability')}
        />
      </List.Section>

      <Button
        mode="outlined"
        textColor={theme.colors.error}
        onPress={() => setConfirmingSignOut(true)}
        style={styles.signOut}
        icon="logout"
      >
        Sair da conta
      </Button>

      <Sheet
        visible={confirmingSignOut}
        onDismiss={() => setConfirmingSignOut(false)}
        title="Sair da conta?"
        subtitle="Você precisará entrar novamente para ver suas escalas."
        footer={
          <>
            <Button
              mode="outlined"
              onPress={() => setConfirmingSignOut(false)}
              style={styles.sheetAction}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSignOut}
              loading={signingOut}
              buttonColor={theme.colors.error}
              style={styles.sheetAction}
            >
              Sair
            </Button>
          </>
        }
      >
        <View />
      </Sheet>
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
