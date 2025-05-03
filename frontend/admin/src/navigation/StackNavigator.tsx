import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@/contexts/ThemeContext';
import HomeScreen from '@/app/[lang]/index';
import ContactScreen from '@/app/[lang]/contact';

const Stack = createStackNavigator();

export default function StackNavigator() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        },
        headerTintColor: isDark ? '#ffffff' : '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="index"
    >
      <Stack.Screen
        name="index"
        component={HomeScreen}
        options={{
          title: 'Home'
        }}
      />
      <Stack.Screen
        name="contact"
        component={ContactScreen}
        options={{
          title: 'Contact'
        }}
      />
    </Stack.Navigator>
  );
}
