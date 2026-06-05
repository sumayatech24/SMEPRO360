import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import InventoryScreen from '../screens/InventoryScreen';
import FinanceScreen from '../screens/FinanceScreen';
import HRScreen from '../screens/HRScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import TicketsScreen from '../screens/TicketsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, getTheme } from '../store/themeStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <View style={[tabStyles.icon, focused && tabStyles.iconActive]}>
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
  </View>
);

const tabStyles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  iconActive: { backgroundColor: '#6366f115', borderRadius: 12 },
});

const TAB_OPTIONS = {
  tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', height: 62, paddingBottom: 10, paddingTop: 6 },
  tabBarActiveTintColor: '#6366f1',
  tabBarInactiveTintColor: '#94a3b8',
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
  headerStyle: { backgroundColor: '#fff', elevation: 1, shadowOpacity: 0.08 },
  headerTitleStyle: { fontWeight: '700' as const, color: '#1e293b', fontSize: 16 },
};

// ── Projects Stack (includes detail screen) ───────────────────────────────────
function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerTitleStyle: { fontWeight: '700', color: '#1e293b' } }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} options={{ title: '🚀 Projects & Tasks' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={({ route }: any) => ({ title: route.params?.projectName || 'Project Detail' })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { isDark } = useThemeStore();
  const theme = getTheme(isDark);

  const dynamicTabOptions = {
    ...TAB_OPTIONS,
    tabBarStyle: { ...TAB_OPTIONS.tabBarStyle, backgroundColor: theme.tabBar, borderTopColor: theme.tabBorder },
    tabBarActiveTintColor: '#6366f1',
    tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
    headerStyle: { backgroundColor: theme.header },
    headerTitleStyle: { ...TAB_OPTIONS.headerTitleStyle, color: isDark ? '#f1f5f9' : '#1e293b' },
  };

  return (
    <Tab.Navigator screenOptions={dynamicTabOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />, headerTitle: 'SMEPRO360' }} />
      <Tab.Screen name="Leads" component={LeadsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} />, headerTitle: 'Lead Management' }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🤝" focused={focused} />, headerTitle: 'Customers' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />, headerTitle: 'Sales Orders' }} />
      <Tab.Screen name="Projects" component={ProjectsStack} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🚀" focused={focused} />, headerShown: false }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />, headerTitle: 'Inventory' }} />
      <Tab.Screen name="Finance" component={FinanceScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />, headerTitle: 'Finance' }} />
      <Tab.Screen name="HR" component={HRScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />, headerTitle: 'HR & People' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />, tabBarLabel: 'Attendance', headerTitle: 'Attendance' }} />
      <Tab.Screen name="Tickets" component={TicketsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎫" focused={focused} />, headerTitle: 'Support Tickets' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />, headerTitle: 'My Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  React.useEffect(() => {
    useAuthStore.getState().loadFromStorage();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff' }}>S</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 20, letterSpacing: 2 }}>SMEPRO360</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 }}>Enterprise ERP & CRM</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
