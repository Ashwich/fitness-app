import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { AppLoader } from '../components/AppLoader';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeFeedScreen from '../screens/user/HomeFeedScreen';
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
import CreatePostScreen from '../screens/user/CreatePostScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import MessagesScreen from '../screens/user/MessagesScreen';
import ChatScreen from '../screens/user/ChatScreen';
import SearchScreen from '../screens/user/SearchScreen';
import GymsScreen from '../screens/user/GymsScreen';
import GymProfileScreen from '../screens/user/GymProfileScreen';
import NutritionDiaryScreen from '../screens/user/NutritionDiaryScreen';
import AttendanceScreen from '../screens/user/AttendanceScreen';
import GymReviewsScreen from '../screens/user/GymReviewsScreen';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

const AuthStack = createNativeStackNavigator();
const AppTabs = createBottomTabNavigator();
const UserStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DiaryStack = createNativeStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShadowVisible: false,
      headerTitleAlign: 'center',
    }}
  >
    <AuthStack.Screen name="Homepage" component={HomepageScreen} options={{ title: 'Welcome' }} />
    <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: `${ENV.APP_NAME} Login` }} />
    <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
    <AuthStack.Screen name="UserDashboard" component={UserDashboardScreen} options={{ title: 'User Dashboard' }} />
  </AuthStack.Navigator>
);

// Home Stack - includes HomeFeedScreen and UserProfileScreen for navigation
const HomeStackNavigator = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <HomeStack.Screen name="HomeFeed" component={HomeFeedScreen} />
    <HomeStack.Screen
      name="UserProfileScreen"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
    <HomeStack.Screen
      name="CreatePostScreen"
      component={CreatePostScreen}
      options={{ title: 'Create Post' }}
    />
    <HomeStack.Screen
      name="SearchScreen"
      component={SearchScreen}
      options={{ title: 'Search' }}
    />
    <HomeStack.Screen
      name="NotificationsScreen"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
    <HomeStack.Screen
      name="MessagesScreen"
      component={MessagesScreen}
      options={{ title: 'Messages' }}
    />
    <HomeStack.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{ title: 'Chat' }}
    />
    <HomeStack.Screen
      name="GymProfileScreen"
      component={GymProfileScreen}
      options={{ title: 'Gym Profile' }}
    />
  </HomeStack.Navigator>
);

const UserStackNavigator = () => (
  <UserStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <UserStack.Screen name="UserDashboard" component={UserDashboardScreen} />
    <UserStack.Screen
      name="PersonalInfoScreen"
      component={PersonalInfoScreen}
      options={{ title: 'Personal Information' }}
    />
    <UserStack.Screen
      name="PhysicalInfoScreen"
      component={PhysicalInfoScreen}
      options={{ title: 'Physical Information' }}
    />
    <UserStack.Screen
      name="FitnessGoalsScreen"
      component={FitnessGoalsScreen}
      options={{ title: 'Fitness Goals' }}
    />
    <UserStack.Screen
      name="CalorieGoalsScreen"
      component={CalorieGoalsScreen}
      options={{ title: 'Nutrition Goals' }}
    />
    <UserStack.Screen
      name="ProfileSummaryScreen"
      component={ProfileSummaryScreen}
      options={{ title: 'Profile Summary' }}
    />
    <UserStack.Screen
      name="WaterIntakeScreen"
      component={WaterIntakeScreen}
      options={{ title: 'Water Intake' }}
    />
    <UserStack.Screen
      name="StepsGoalScreen"
      component={StepsGoalScreen}
      options={{ title: 'Steps Goal' }}
    />
    <UserStack.Screen
      name="ProfileSettingsScreen"
      component={ProfileSettingsScreen}
      options={{ title: 'Settings' }}
    />
    <UserStack.Screen
      name="UserProfileScreen"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
    <UserStack.Screen
      name="NutritionDiaryScreen"
      component={NutritionDiaryScreen}
      options={{ title: 'Nutrition Diary' }}
    />
    <UserStack.Screen
      name="AttendanceScreen"
      component={AttendanceScreen}
      options={{ title: 'Mark Attendance' }}
    />
    <UserStack.Screen
      name="GymReviewsScreen"
      component={GymReviewsScreen}
      options={{ title: 'Gym Reviews' }}
    />
    <UserStack.Screen
      name="GymProfileScreen"
      component={GymProfileScreen}
      options={{ title: 'Gym Profile' }}
    />
  </UserStack.Navigator>
);

// Profile Stack - includes UserProfileScreen and CreatePostScreen
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <ProfileStack.Screen
      name="UserProfileScreen"
      component={UserProfileScreen}
      options={{ title: 'Profile' }}
    />
    <ProfileStack.Screen
      name="CreatePostScreen"
      component={CreatePostScreen}
      options={{ title: 'Create Post' }}
    />
  </ProfileStack.Navigator>
);

// Diary Stack - includes NutritionDiaryScreen
const DiaryStackNavigator = () => (
  <DiaryStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <DiaryStack.Screen
      name="NutritionDiary"
      component={NutritionDiaryScreen}
      options={{ title: 'Nutrition Diary' }}
    />
  </DiaryStack.Navigator>
);

const AppTabNavigator = () => (
  <AppTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#9333ea',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        paddingBottom: 6,
        paddingTop: 6,
        height: 60,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
      },
      tabBarIcon: ({ color, size, focused }) => {
        let iconName = 'home-outline';
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Dashboard') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Diary') {
          iconName = focused ? 'restaurant' : 'restaurant-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else if (route.name === 'Gyms') {
          iconName = focused ? 'fitness' : 'fitness-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <AppTabs.Screen 
      name="Home" 
      component={HomeStackNavigator} 
      options={{ title: 'Home' }} 
    />
    <AppTabs.Screen 
      name="Dashboard" 
      component={UserStackNavigator} 
      options={{ title: 'Dashboard' }} 
    />
    <AppTabs.Screen 
      name="Diary" 
      component={DiaryStackNavigator} 
      options={{ title: 'Diary' }} 
    />
    <AppTabs.Screen 
      name="Profile" 
      component={ProfileStackNavigator} 
      options={{ title: 'Profile' }} 
    />
    <AppTabs.Screen 
      name="Gyms" 
      component={GymsScreen} 
      options={{ title: 'Gym' }} 
    />
  </AppTabs.Navigator>
);

export const AppNavigator = () => {
  const { token, initializing } = useAuth();

  if (initializing) {
    return <AppLoader />;
  }

  return (
    <NavigationContainer>{token ? <AppTabNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
};

export default AppNavigator;


