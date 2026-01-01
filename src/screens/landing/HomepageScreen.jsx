import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';

const { width } = Dimensions.get('window');

const HomepageScreen = ({ navigation }) => (
  <ScreenContainer style={styles.container}>
    
    {/* 1. Top Section: Image & Branding */}
    <View style={styles.heroSection}>
      {/* Placeholder for your logo or fitness illustration */}
      <Image 
        source={{ uri: 'https://img.freepik.com/free-vector/fitness-tracker-concept-illustration_114360-4668.jpg' }} 
        style={styles.heroImage}
        resizeMode="contain"
      />
      
      <View style={styles.textContainer}>
        <Text style={styles.brandTag}>FITSERA APP</Text>
        <Text style={styles.title}>Transform Your Body,{' '}<Text style={styles.highlight}>Transform Your Life</Text></Text>
        <Text style={styles.subtitle}>
          Your personal fitness companion. Track workouts, manage goals, and crush your limits.
        </Text>
      </View>
    </View>

    {/* 2. Bottom Section: Actions */}
    <View style={styles.actionSection}>
      <PrimaryButton
        title="Get Started"
        onPress={() => navigation.navigate('Register')}
        // Assuming your component accepts container styles, add visual weight here
      />

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>

  </ScreenContainer>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background
    justifyContent: 'space-between',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  heroImage: {
    width: width * 0.8,
    height: width * 0.7, // Keep aspect ratio square-ish
    marginBottom: 30,
  },
  textContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#6366F1', // Indigo/Brand Color
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  highlight: {
    color: '#6366F1', // Highlight color matches brand tag
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingBottom: 48, // Space from bottom of screen
    gap: 20,
  },
  // New "Login" style to differentiate from "Register"
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    fontSize: 15,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1', // Brand color
  },
});

export default HomepageScreen;