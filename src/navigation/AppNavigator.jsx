import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { AppLoader } from '../components/AppLoader';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import HomeFeedScreen from '../screens/user/HomeFeedScreen';
import UserProfileScreen from '../screens/user/UserProfileScreen';
import HomepageScreen from '../screens/landing/HomepageScreen';
import GymSignupScreen from '../screens/auth/GymSignupScreen';
import SuperAdminLoginScreen from '../screens/auth/SuperAdminLoginScreen';
import GymAdminLoginScreen from '../screens/auth/GymAdminLoginScreen';
import StaffLoginScreen from '../screens/auth/StaffLoginScreen';
import UserPortalLoginScreen from '../screens/auth/UserPortalLoginScreen';
import GymSuperAdminDashboardScreen from '../screens/admin/GymSuperAdminDashboardScreen';
import SuperAdminDashboardScreen from '../screens/admin/SuperAdminDashboardScreen';
import GymAdminDashboardScreen from '../screens/admin/GymAdminDashboardScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
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
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

const AuthStack = createNativeStackNavigator();
const AppTabs = createBottomTabNavigator();
const UserStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

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
    <AuthStack.Screen name="GymSignup" component={GymSignupScreen} options={{ title: 'Gym signup' }} />
    <AuthStack.Screen name="SuperAdminLogin" component={SuperAdminLoginScreen} options={{ title: 'Super admin' }} />
    <AuthStack.Screen name="GymAdminLogin" component={GymAdminLoginScreen} options={{ title: 'Gym admin login' }} />
    <AuthStack.Screen name="StaffLogin" component={StaffLoginScreen} options={{ title: 'Staff login' }} />
    <AuthStack.Screen name="UserPortalLogin" component={UserPortalLoginScreen} options={{ title: 'User portal login' }} />
    <AuthStack.Screen name="GymSuperAdminDashboard" component={GymSuperAdminDashboardScreen} options={{ title: 'Gym Super Admin' }} />
    <AuthStack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} options={{ title: 'Super Admin' }} />
    <AuthStack.Screen name="GymAdminDashboard" component={GymAdminDashboardScreen} options={{ title: 'Gym Admin' }} />
    <AuthStack.Screen name="StaffDashboard" component={StaffDashboardScreen} options={{ title: 'Staff Dashboard' }} />
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
  </UserStack.Navigator>
);

const AppTabNavigator = () => (
  <AppTabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        paddingBottom: 6,
        height: 60,
      },
      tabBarIcon: ({ color, size, focused }) => {
        let iconName = 'home-outline';
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Dashboard') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'CreatePost') {
          // Special larger icon for create post
          return (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: focused ? '#2563eb' : '#9ca3af',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -8,
            }}>
              <Ionicons name="add" size={32} color="#ffffff" />
            </View>
          );
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
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
      name="CreatePost" 
      component={CreatePostScreen} 
      options={{ title: 'Post' }} 
    />
    <AppTabs.Screen 
      name="Profile" 
      component={UserProfileScreen} 
      options={{ title: 'Profile' }} 
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


