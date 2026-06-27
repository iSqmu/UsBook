import { COLORES } from '@/constants/colors';
import { StyleSheet } from 'react-native';

export const mainStyles = StyleSheet.create({
  view: {
    backgroundColor: COLORES.fondo,
  },
  container: {
    marginTop: 50,
    flex: 1,
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.textoOscuro,
    marginBottom: 20,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
