import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppLoader } from '../components/AppLoader';
import LoginScreen from '../screens/auth/LoginScreen';
import LinkPhoneScreen from '../screens/auth/LinkPhoneScreen';
import UserProfileScreen from '../screens/user/UserProfileScreen';
import HomepageScreen from '../screens/landing/HomepageScreen';
import UserDashboardScreen from '../screens/user/UserDashboardScreen';
import PersonalInfoScreen from '../screens/user/PersonalInfoScreen';
import PhysicalInfoScreen from '../screens/user/PhysicalInfoScreen';
import FitnessGoalsScreen from '../screens/user/FitnessGoalsScreen';
import CalorieGoalsScreen from '../screens/user/CalorieGoalsScreen';
import ProfileSummaryScreen from '../screens/user/ProfileSummaryScreen';
import WaterIntakeScreen from '../screens/user/WaterIntakeScreen';
import StepsGoalScreen from '../screens/user/StepsGoalScreen';
import ProfileSettingsScreen from '../screens/user/ProfileSettingsScreen';
import NutritionDiaryScreen from '../screens/user/NutritionDiaryScreen';
import AttendanceScreen from '../screens/user/AttendanceScreen';
import WaitingForGymScreen from '../screens/user/WaitingForGymScreen';
import GymWaitScreen from '../screens/user/GymWaitScreen';
import GymHomeScreen from '../screens/user/GymHomeScreen';
import GymSelectScreen from '../screens/user/GymSelectScreen';
import DietPlansScreen from '../screens/user/DietPlansScreen';
import WorkoutPlanScreen from '../screens/user/WorkoutPlanScreen';
import PeriodTrackingScreen from '../screens/user/PeriodTrackingScreen';
import { useAuth } from '../context/AuthContext';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const AppTabs = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const DietStack = createNativeStackNavigator();
const WorkoutStack = createNativeStackNavigator();
const GymStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShadowVisible: false,
      headerTitleAlign: 'center',
    }}
  >
    <AuthStack.Screen name="Homepage" component={HomepageScreen} options={{ title: 'Welcome' }} />
    <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
    <AuthStack.Screen name="UserDashboard" component={UserDashboardScreen} options={{ title: 'User Dashboard' }} />
  </AuthStack.Navigator>
);

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="UserDashboard" component={UserDashboardScreen} />
    <HomeStack.Screen name="PersonalInfoScreen" component={PersonalInfoScreen} />
    <HomeStack.Screen name="PhysicalInfoScreen" component={PhysicalInfoScreen} />
    <HomeStack.Screen name="FitnessGoalsScreen" component={FitnessGoalsScreen} />
    <HomeStack.Screen name="CalorieGoalsScreen" component={CalorieGoalsScreen} />
    <HomeStack.Screen name="ProfileSummaryScreen" component={ProfileSummaryScreen} />
    <HomeStack.Screen name="WaterIntakeScreen" component={WaterIntakeScreen} />
    <HomeStack.Screen name="StepsGoalScreen" component={StepsGoalScreen} />
    <HomeStack.Screen name="ProfileSettingsScreen" component={ProfileSettingsScreen} />
    <HomeStack.Screen name="NutritionDiaryScreen" component={NutritionDiaryScreen} />
    <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    <HomeStack.Screen name="UserProfileScreen" component={UserProfileScreen} />
    <HomeStack.Screen name="WaitingForGymScreen" component={WaitingForGymScreen} />
    <HomeStack.Screen name="PeriodTrackingScreen" component={PeriodTrackingScreen} />
  </HomeStack.Navigator>
);

const DietStackNavigator = () => (
  <DietStack.Navigator screenOptions={{ headerShown: false }}>
    <DietStack.Screen name="DietPlans" component={DietPlansScreen} />
    <DietStack.Screen name="NutritionDiaryScreen" component={NutritionDiaryScreen} />
  </DietStack.Navigator>
);

const WorkoutStackNavigator = () => (
  <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
    <WorkoutStack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} />
  </WorkoutStack.Navigator>
);

const GymEntryScreen = (props) => {
  const { gymLinked } = useAuth();
  return gymLinked ? <GymHomeScreen {...props} /> : <GymWaitScreen {...props} />;
};

const GymStackNavigator = () => (
  <GymStack.Navigator screenOptions={{ headerShown: false }}>
    <GymStack.Screen name="GymHome" component={GymEntryScreen} />
    <GymStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    <GymStack.Screen name="GymWaitScreen" component={GymWaitScreen} />
  </GymStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="UserProfileScreen" component={UserProfileScreen} />
    <ProfileStack.Screen name="ProfileSettingsScreen" component={ProfileSettingsScreen} />
    <ProfileStack.Screen name="PersonalInfoScreen" component={PersonalInfoScreen} />
    <ProfileStack.Screen name="PhysicalInfoScreen" component={PhysicalInfoScreen} />
    <ProfileStack.Screen name="FitnessGoalsScreen" component={FitnessGoalsScreen} />
    <ProfileStack.Screen name="CalorieGoalsScreen" component={CalorieGoalsScreen} />
    <ProfileStack.Screen name="PeriodTrackingScreen" component={PeriodTrackingScreen} />
    <ProfileStack.Screen name="StepsGoalScreen" component={StepsGoalScreen} />
    <ProfileStack.Screen name="WaterIntakeScreen" component={WaterIntakeScreen} />
  </ProfileStack.Navigator>
);

const AppTabNavigator = () => (
  <AppTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#30d158',
      tabBarInactiveTintColor: 'rgba(235,235,245,0.32)',
      tabBarStyle: {
        paddingBottom: 8,
        paddingTop: 8,
        height: 64,
        backgroundColor: 'rgba(14,14,16,0.96)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(84,84,88,0.34)',
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.05,
      },
      tabBarIcon: ({ color, size, focused }) => {
        let iconName = 'home-outline';
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Diet') {
          iconName = focused ? 'nutrition' : 'nutrition-outline';
        } else if (route.name === 'Workout') {
          iconName = focused ? 'barbell' : 'barbell-outline';
        } else if (route.name === 'Gym') {
          iconName = focused ? 'fitness' : 'fitness-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <AppTabs.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Home' }} />
    <AppTabs.Screen name="Diet" component={DietStackNavigator} options={{ title: 'Diet' }} />
    <AppTabs.Screen name="Workout" component={WorkoutStackNavigator} options={{ title: 'Workout' }} />
    <AppTabs.Screen name="Gym" component={GymStackNavigator} options={{ title: 'Gym' }} />
    <AppTabs.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
  </AppTabs.Navigator>
);

const AuthenticatedNavigator = () => {
  const { needsGymWait, needsGymChoice, needsPhoneLink } = useAuth();

  if (needsPhoneLink) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="LinkPhone" component={LinkPhoneScreen} />
      </RootStack.Navigator>
    );
  }

  if (needsGymChoice) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="GymSelect" component={GymSelectScreen} />
      </RootStack.Navigator>
    );
  }

  if (needsGymWait) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="WaitingForGym" component={WaitingForGymScreen} />
      </RootStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={AppTabNavigator} />
    </RootStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { token, initializing } = useAuth();

  if (initializing) {
    return <AppLoader />;
  }

  return (
    <NavigationContainer>
      {token ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
