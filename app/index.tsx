import PrimaryButton from '@/components/primaryButton';
import PrimaryInput from '@/components/primaryInput';
import { COLORES } from '@/constants/colors';
import { supabase } from '@/libs/supabase';
import * as NotificationService from '@/services/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
interface FormViewProps {
  step: number;
  gender: string;
  setGender: (gender: string) => void;
  username: string;
  setUsername: (username: string) => void;
}

function FormView({
  step,
  gender,
  setGender,
  username,
  setUsername,
}: FormViewProps) {
  switch (step) {
    case 0:
      return (
        <View style={styles.formView}>
          <Text>Tu nombre de usuario (sin espacios):</Text>
          <PrimaryInput
            placeholder="Tu username"
            value={username}
            onChangeText={setUsername}
          />
        </View>
      );
    case 1:
      return (
        <View style={{ width: '100%', marginTop: 10 }}>
          <Picker
            selectedValue={gender}
            onValueChange={setGender}
            mode="dropdown"
            style={{
              backgroundColor: '#f1f2f6',
              borderRadius: 15,
              width: '100%',
              color: COLORES.textoOscuro,
            }}
          >
            <Picker.Item label="Selecciona tu género" value="" />
            <Picker.Item label="Masculino" value="masculino" />
            <Picker.Item label="Femenino" value="femenino" />
          </Picker>
        </View>
      );
    default:
      return null;
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { setHasProfile } = useAuthStore();
  const [step, setStep] = useState<number>(0);
  const [gender, setGender] = useState('');
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    if (!email || !password)
      return Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Por favor ingresa tu correo y contraseña.',
        position: 'bottom',
      });

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Correo o contraseña incorrectos',
        position: 'bottom',
      });
    }

    const user = data?.user;

    if (user) {
      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setLoading(false);
        return Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Ocurrió un error al verificar tu perfil.',
          position: 'bottom',
        });
      }

      if (!profile || !profile.username) {
        setShowUsernameForm(true);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  async function createCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let code = '';
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return code;
  }

  // ✅ FIX 1: Cada validación retorna true o undefined (no se mezclan con Toast.show)
  async function handleSaveUsername(): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setStep(0);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Ocurrió un error al verificar tu nombre de usuario.',
        position: 'bottom',
      });
      return false;
    }

    if (data && data.username) {
      setStep(0);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'El nombre de usuario ya está en uso. Por favor elige otro.',
        position: 'bottom',
      });
      return false;
    }

    if (!username || username.trim() === '') {
      setStep(0);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Por favor ingresa un nombre de usuario.',
        position: 'bottom',
      });
      return false;
    }

    if (username.includes(' ')) {
      setStep(0);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'El nombre de usuario no puede contener espacios.',
        position: 'bottom',
      });
      return false;
    }

    return true;
  }

  async function handleSaveGender(): Promise<boolean> {
    if (!gender) {
      setStep(1);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Por favor selecciona un género.',
        position: 'bottom',
      });
      return false;
    }

    return true;
  }

  async function handleSaveProfile() {
    // ✅ FIX 1: Early returns encadenados — se detiene en la primera validación fallida
    const isUsernameValid = await handleSaveUsername();
    if (!isUsernameValid) return;

    const isGenderValid = await handleSaveGender();
    if (!isGenderValid) return;

    if (!userId) return;

    try {
      let code = await createCode();

      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (error) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Ocurrió un error al generar tu código de pareja.',
            position: 'bottom',
          });
          return;
        }

        if (!data) break;

        code = await createCode();
      }

      // ✅ FIX 2: Verificar error del insert ANTES de continuar con el update
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        username: username,
        gender: gender,
        code: code,
      });

      if (insertError) {
        console.log(JSON.stringify(insertError, null, 2));
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Ocurrió un error al guardar tu perfil.',
          position: 'bottom',
        });
        return;
      }

      NotificationService.createNotification(
        userId,
        `¡Bienvenido a usBook, ${username}!`,
        'Tu perfil ha sido creado exitosamente.',
      );
      setHasProfile(true);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleNextStep() {
    if (step < 1) {
      setStep(step + 1);
    } else {
      await handleSaveProfile();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>UsBook</Text>

      {showUsernameForm ? (
        <>
          <Text style={styles.subtitulo}>
            ¡Bienvenido! Antes de continuar, necesitamos que completes tu
            perfil.
          </Text>
          <View
            style={{
              width: '100%',
              alignItems: 'center',
              padding: 5,
              borderRadius: 10,
            }}
          >
            <FormView
              step={step}
              gender={gender}
              setGender={setGender}
              username={username}
              setUsername={setUsername}
            />
          </View>

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {step > 0 && (
                  <PrimaryButton
                    title="Regresar"
                    onPress={() => setStep(step - 1)}
                  />
                )}
                <PrimaryButton
                  title={step < 1 ? 'Continuar' : 'Registrar'}
                  onPress={handleNextStep}
                />
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.subtitulo}>
            Ingresa a usBook y descubre una forma distinta de compartir
          </Text>

          <PrimaryInput
            placeholder="Tu Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <PrimaryInput
            placeholder="Tu Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <PrimaryButton title="Iniciar Sesión" onPress={handleLogin} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2f3640',
  },
  subtitulo: {
    fontSize: 14,
    color: '#747d8c',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 15,
    alignItems: 'center',
  },
  linkRegister: {
    color: '#007bff',
    marginTop: 15,
    fontWeight: '600',
    fontSize: 14,
  },
  formView: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
});
