import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppLoader } from '../components/AppLoader';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import { colors, FONT_FAMILY } from '../theme/opengym';

import HomepageScreen from '../screens/landing/HomepageScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import LinkPhoneScreen from '../screens/auth/LinkPhoneScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import GymSelectScreen from '../screens/user/GymSelectScreen';
import WaitingForGymScreen from '../screens/user/WaitingForGymScreen';

import TodayScreen from '../screens/main/TodayScreen';
import TrainScreen from '../screens/main/TrainScreen';
import EatScreen from '../screens/main/EatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ActivityScreen from '../screens/main/ActivityScreen';
import HydrationScreen from '../screens/main/HydrationScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import SetupEditScreen from '../screens/main/SetupEditScreen';
import GymHomeScreen from '../screens/user/GymHomeScreen';
import GymWaitScreen from '../screens/user/GymWaitScreen';
import NutritionDiaryScreen from '../screens/user/NutritionDiaryScreen';
import DietPlansScreen from '../screens/user/DietPlansScreen';
import CalorieGoalsScreen from '../screens/user/CalorieGoalsScreen';
import AttendanceScreen from '../screens/user/AttendanceScreen';
import PeriodTrackingScreen from '../screens/user/PeriodTrackingScreen';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.ink,
    background: colors.bg,
    card: colors.surface,
    text: colors.label,
    border: colors.border,
    notification: colors.red,
  },
};

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
};

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={stackOptions}>
    <AuthStack.Screen name="Homepage" component={HomepageScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const GymTab = (props) => {
  const { gymLinked } = useAuth();
  return gymLinked ? <GymHomeScreen {...props} /> : <GymWaitScreen {...props} />;
};

const TAB_ICONS = { Today: 'home', Train: 'train', Eat: 'eat', Gym: 'gym', Profile: 'profile' };

const MainTabs = () => (
  <Tabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.label,
      tabBarInactiveTintColor: colors.label3,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color }) => <Icon name={TAB_ICONS[route.name]} size={22} color={color} />,
      sceneStyle: { backgroundColor: colors.bg },
    })}
  >
    <Tabs.Screen name="Today" component={TodayScreen} />
    <Tabs.Screen name="Train" component={TrainScreen} />
    <Tabs.Screen name="Eat" component={EatScreen} />
    <Tabs.Screen name="Gym" component={GymTab} />
    <Tabs.Screen name="Profile" component={ProfileScreen} />
  </Tabs.Navigator>
);

const AuthenticatedNavigator = () => {
  const { needsGymWait, needsGymChoice, needsPhoneLink, needsOnboarding } = useAuth();

  if (needsPhoneLink) {
    return (
      <RootStack.Navigator screenOptions={stackOptions}>
        <RootStack.Screen name="LinkPhone" component={LinkPhoneScreen} />
      </RootStack.Navigator>
    );
  }
  if (needsGymChoice) {
    return (
      <RootStack.Navigator screenOptions={stackOptions}>
        <RootStack.Screen name="GymSelect" component={GymSelectScreen} />
      </RootStack.Navigator>
    );
  }
  if (needsOnboarding) {
    return (
      <RootStack.Navigator screenOptions={stackOptions}>
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      </RootStack.Navigator>
    );
  }
  if (needsGymWait) {
    return (
      <RootStack.Navigator screenOptions={stackOptions}>
        <RootStack.Screen name="WaitingForGym" component={WaitingForGymScreen} />
      </RootStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={stackOptions}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Activity" component={ActivityScreen} />
      <RootStack.Screen name="Hydration" component={HydrationScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="PersonalDetails" component={SetupEditScreen} initialParams={{ kind: 'about' }} />
      <RootStack.Screen name="BodyEdit" component={SetupEditScreen} initialParams={{ kind: 'body' }} />
      <RootStack.Screen name="PlanEdit" component={SetupEditScreen} initialParams={{ kind: 'plan' }} />
      <RootStack.Screen name="CalorieGoalsScreen" component={CalorieGoalsScreen} />
      <RootStack.Screen name="NutritionDiaryScreen" component={NutritionDiaryScreen} />
      <RootStack.Screen name="DietPlans" component={DietPlansScreen} />
      <RootStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
      <RootStack.Screen name="PeriodTrackingScreen" component={PeriodTrackingScreen} />
    </RootStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { token, initializing } = useAuth();
  if (initializing) return <AppLoader />;
  return (
    <NavigationContainer theme={navTheme}>
      {token ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: { fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '600', marginTop: 2 },
});

export default AppNavigator;
