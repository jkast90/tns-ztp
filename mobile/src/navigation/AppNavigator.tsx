import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { DevicesScreen } from '../screens/DevicesScreen';
import { VendorsScreen } from '../screens/VendorsScreen';
import { DhcpOptionsScreen } from '../screens/DhcpOptionsScreen';
import { DeviceFormScreen } from '../screens/DeviceFormScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#4a9eff',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="DevicesTab"
        component={DevicesScreen}
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="devices" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VendorsTab"
        component={VendorsScreen}
        options={{
          title: 'Vendors',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DhcpTab"
        component={DhcpOptionsScreen}
        options={{
          title: 'DHCP',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="lan" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0f0f1a',
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DeviceForm"
          component={DeviceFormScreen}
          options={{ title: 'Device' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: 'Scan Serial',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
